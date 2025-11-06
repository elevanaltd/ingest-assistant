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
   * This embeds EXIF/XMP metadata that Premiere Pro and other tools can read
   *
   * @param filePath Absolute path to media file
   * @param mainName Main descriptive name
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

    // Title/DocumentTitle - Main descriptive name
    if (mainName) {
      // Write to multiple metadata fields for compatibility
      args.push(`-Title=${mainName}`);
      args.push(`-XMP:Title=${mainName}`);
      args.push(`-IPTC:ObjectName=${mainName}`);
    }

    // Keywords - Array of tags
    // Write each tag individually so exiftool creates proper array structure
    // This ensures Premiere Pro and other tools see them as separate searchable keywords
    // Note: -Keywords writes to IPTC:Keywords, -XMP:Subject writes to XMP namespace
    tags.forEach(tag => {
      args.push(`-Keywords=${tag}`);
      args.push(`-XMP:Subject=${tag}`);
    });

    // Description - Combine for searchability
    if (mainName || tags.length > 0) {
      const description = mainName
        ? tags.length > 0
          ? `${mainName} - ${tags.join(', ')}`
          : mainName
        : tags.join(', ');

      args.push(`-Description=${description}`);
      args.push(`-XMP:Description=${description}`);
      args.push(`-IPTC:Caption-Abstract=${description}`);
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
