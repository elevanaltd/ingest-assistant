import { execFile } from 'child_process';
import { promisify } from 'util';
import { existsSync } from 'fs';

const execFileAsync = promisify(execFile);

/**
 * Find exiftool binary path.
 * In packaged apps, PATH may not include Homebrew locations.
 * Check common installation paths.
 */
function findExiftool(): string {
  // Common installation paths (Homebrew, MacPorts, manual install)
  const commonPaths = [
    '/usr/local/bin/exiftool',      // Homebrew Intel
    '/opt/homebrew/bin/exiftool',   // Homebrew Apple Silicon
    '/opt/local/bin/exiftool',      // MacPorts
    '/usr/bin/exiftool',             // System install
  ];

  for (const exiftoolPath of commonPaths) {
    if (existsSync(exiftoolPath)) {
      return exiftoolPath;
    }
  }

  // Fallback to PATH (works in development)
  return 'exiftool';
}

// Shell metacharacters that indicate injection attempt
// Parentheses, hyphens, apostrophes, brackets are SAFE (common in metadata)
// Dangerous: semicolon, pipe, ampersand, backtick, dollar, newline, angle brackets
const SHELL_METACHARACTERS = /[;|&$`\n<>{}!]/;

/**
 * MetadataWriter service for embedding metadata into media files via exiftool.
 *
 * Security: Uses execFile() to prevent shell injection (no shell expansion).
 * Validates input for shell metacharacters before processing.
 *
 * Mitigates: CRITICAL-1 (CWE-78 OS Command Injection)
 *
 * Security-specialist: identified vulnerability and exploitation scenarios
 * Critical-engineer: validated execFile() mitigation approach
 */
export class MetadataWriter {
  /**
   * Parse keywords from exiftool output
   * exiftool may return keywords in different formats:
   * - Array with comma-separated string: ['tag1, tag2, tag3'] (most common when we write multiple tags)
   * - Array of strings: ['tag1', 'tag2']
   * - Single string: 'tag1'
   * - Comma-separated string: 'tag1, tag2, tag3'
   */
  private parseKeywords(keywords: string | string[] | undefined): string[] {
    if (!keywords) {
      return [];
    }

    // Handle array - check each element for commas
    if (Array.isArray(keywords)) {
      // Flatten array by splitting any comma-separated elements
      return keywords.flatMap(keyword => {
        if (typeof keyword === 'string' && keyword.includes(',')) {
          return keyword.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
        }
        return keyword;
      });
    }

    // Single string - check if it contains commas
    if (typeof keywords === 'string') {
      if (keywords.includes(',')) {
        return keywords.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
      }
      return [keywords];
    }

    return [];
  }

  /**
   * Validates metadata input for shell metacharacters.
   *
   * @throws Error if input contains shell metacharacters
   */
  private validateInput(input: string, fieldName: string): void {
    if (SHELL_METACHARACTERS.test(input)) {
      throw new Error(
        `Invalid ${fieldName}: Contains potentially dangerous characters (;|&$\`<>)`
      );
    }

    // Additional length validation
    if (input.length > 1000) {
      throw new Error(`Invalid ${fieldName}: Too long (max 1000 characters)`);
    }
  }

  /**
   * Write metadata directly into the file using exiftool.
   *
   * Security: Uses execFile() (NOT exec()) to prevent shell injection.
   * Validates all user input before processing.
   *
   * METADATA STRATEGY (Issue #54 - Simplified):
   * - XMP-dc:Title = mainName (structured title: location-subject-action-shotType)
   *   → Survives Premiere Pro proxy conversion, searchable by editors
   * - XMP-dc:Description = tags (comma-separated keywords)
   *   → Survives proxy conversion, searchable via "Search All" in PP
   * - Structured components (location, subject, action, shotType) stored in JSON sidecar
   *   → Enables cataloguer editing in Ingest Assistant and CEP Panel
   *   → JSON stays with files throughout project lifecycle
   *
   * @param filePath Absolute path to media file
   * @param mainName Structured title (location-subject-action-shotType)
   * @param tags Array of keyword tags
   * @throws Error if metadata contains shell metacharacters or file operation fails
   */
  async writeMetadataToFile(
    filePath: string,
    mainName: string,
    tags: string[]
  ): Promise<void> {
    // Validate inputs for shell metacharacters
    if (mainName) {
      this.validateInput(mainName, 'mainName');
    }

    tags.forEach((tag, index) => {
      this.validateInput(tag, `tag[${index}]`);
    });

    // Build exiftool arguments (array, NOT string concatenation)
    const args: string[] = [];

    // XMP Title = Structured title (location-subject-action-shotType)
    // Automatically writes to XMP-dc:Title (Dublin Core)
    if (mainName) {
      args.push(`-Title=${mainName}`);
      args.push(`-XMP:Title=${mainName}`);
      args.push(`-IPTC:ObjectName=${mainName}`);
    }

    // Keywords - Array of tags for searchability
    // Write each tag individually so exiftool creates proper array structure
    tags.forEach(tag => {
      args.push(`-Keywords=${tag}`);
      args.push(`-XMP:Subject=${tag}`); // Dublin Core Subject (keywords array)
    });

    // XMP Description = Metadata tags (comma-separated for editor search)
    // Automatically writes to XMP-dc:Description (Dublin Core)
    // This field survives Premiere Pro proxy conversion
    if (tags.length > 0) {
      const descriptionValue = tags.join(', ');
      args.push(`-Description=${descriptionValue}`);
      args.push(`-XMP:Description=${descriptionValue}`);
      args.push(`-IPTC:Caption-Abstract=${descriptionValue}`);
    }

    // Don't create backup files
    args.push('-overwrite_original');

    // Add file path
    args.push(filePath);

    try {
      // SECURITY: execFile() prevents shell injection
      // Arguments passed as array (no shell expansion)
      const exiftoolPath = findExiftool();
      const { stderr } = await execFileAsync(exiftoolPath, args, {
        timeout: 30000,        // 30 second timeout
        maxBuffer: 10 * 1024 * 1024  // 10MB output limit
      });

      // Log success internally
      console.log('Metadata written to file:', filePath);

      if (stderr && !stderr.includes('image files updated')) {
        console.warn('exiftool stderr:', stderr);
      }
    } catch (error) {
      console.error('Failed to write metadata to file:', error);

      // Provide actionable error message
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error(
          'exiftool not found. Please install exiftool: brew install exiftool'
        );
      }

      // Include actual error details for debugging
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Metadata write failed: ${errorMessage}`);
    }
  }

  /**
   * Read metadata from file using exiftool.
   *
   * @param filePath Absolute path to media file
   * @returns Object with title and keywords
   */
  async readMetadataFromFile(filePath: string): Promise<{
    title?: string;
    keywords?: string[];
    description?: string;
  }> {
    try {
      const args = ['-Title', '-Keywords', '-Description', '-json', filePath];
      const exiftoolPath = findExiftool();

      const { stdout } = await execFileAsync(exiftoolPath, args, {
        timeout: 30000,
        maxBuffer: 10 * 1024 * 1024
      });

      const data = JSON.parse(stdout);

      if (data && data.length > 0) {
        const metadata = data[0];
        return {
          title: metadata.Title,
          keywords: this.parseKeywords(metadata.Keywords),
          description: metadata.Description,
        };
      }

      return {};
    } catch (error) {
      console.error('Failed to read metadata from file:', error);
      return {};
    }
  }
}
