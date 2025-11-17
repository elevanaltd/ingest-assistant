import { execFile } from 'child_process';
import { promisify } from 'util';
import { existsSync, unlinkSync } from 'fs';

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
   * Read TapeName from file using exiftool.
   *
   * Used for safety check before writing camera ID to TapeName field.
   * Only writes if TapeName is blank (never overwrite existing values).
   *
   * @param filePath Absolute path to media file
   * @returns TapeName value or undefined if not found/error
   */
  async readTapeNameFromFile(filePath: string): Promise<string | undefined> {
    try {
      const args = ['-XMP-xmpDm:TapeName', '-json', filePath];
      const exiftoolPath = findExiftool();

      const { stdout } = await execFileAsync(exiftoolPath, args, {
        timeout: 30000,
        maxBuffer: 10 * 1024 * 1024
      });

      const data = JSON.parse(stdout);
      if (data && data.length > 0) {
        return data[0].TapeName;
      }

      return undefined;
    } catch (error) {
      console.error('Failed to read TapeName from file:', error);
      return undefined;
    }
  }

  /**
   * Write metadata directly into the file using exiftool.
   *
   * Security: Uses execFile() (NOT exec()) to prevent shell injection.
   * Validates all user input before processing.
   *
   * This embeds EXIF/XMP metadata that Premiere Pro and other tools can read.
   *
   * METADATA STRATEGY (Issue #54):
   * Simplified approach that survives proxy conversion:
   * - XMP-dc:Title = mainName (combined entity: location-subject-action-shotType)
   *   → Survives proxy conversion, searchable in PP, editor-friendly
   * - XMP-dc:Description = keywords (comma-separated) OR custom description
   *   → Survives proxy conversion, searchable in PP
   *
   * Structured components (location, subject, action, shotType) are stored in JSON sidecar
   * for cataloguer editing in both Ingest Assistant and CEP Panel.
   *
   * @param filePath Absolute path to media file
   * @param mainName Structured title (location-subject-action-shotType)
   * @param tags Array of keyword tags
   * @param structured Optional structured components (reserved for future JSON integration)
   * @param description Optional custom description (if not provided, uses tags.join(', '))
   * @throws Error if metadata contains shell metacharacters or file operation fails
   */
  async writeMetadataToFile(
    filePath: string,
    mainName: string,
    tags: string[],
    structured?: {
      location?: string;
      subject?: string;
      action?: string;
      shotType?: string;
      date?: string;
      shotNumber?: number;
      cameraId?: string;
    },
    description?: string
  ): Promise<void> {
    // Validate inputs for shell metacharacters
    if (mainName) {
      this.validateInput(mainName, 'mainName');
    }

    tags.forEach((tag, index) => {
      this.validateInput(tag, `tag[${index}]`);
    });

    // Validate structured components if provided
    if (structured) {
      if (structured.location) {
        this.validateInput(structured.location, 'structured.location');
      }
      if (structured.subject) {
        this.validateInput(structured.subject, 'structured.subject');
      }
      if (structured.action) {
        this.validateInput(structured.action, 'structured.action');
      }
      if (structured.shotType) {
        this.validateInput(structured.shotType, 'structured.shotType');
      }
      if (structured.date) {
        this.validateInput(structured.date, 'structured.date');
      }
      if (structured.cameraId) {
        this.validateInput(structured.cameraId, 'structured.cameraId');
      }
    }

    // Validate custom description if provided
    if (description) {
      this.validateInput(description, 'description');
    }

    // Build exiftool arguments (array, NOT string concatenation)
    const args: string[] = [];

    // PREMIERE PRO NATIVE FIELDS (Issue #54):
    // Use XMP Dynamic Media namespace - maps directly to PP Shot field
    // XMP-xmpDM:shotName → PP Shot field (survives offline, even without proxies!)
    // XMP-xmpDM:LogComment → Structured data for CEP panel parsing
    // Structured components (location, subject, action, shotType) stored in JSON sidecar

    // XMP-xmpDm:shotName = Combined entity (maps directly to PP Shot field)
    if (mainName) {
      const shotNameWithNumber = structured?.shotNumber
        ? `${mainName}-#${structured.shotNumber}`
        : mainName;
      args.push(`-XMP-xmpDM:shotName=${shotNameWithNumber}`);
    }

    // XMP-xmpDm:TapeName = Camera ID (ONLY write if blank - never overwrite)
    // Safety check: Read existing TapeName first
    if (structured?.cameraId) {
      const existingTapeName = await this.readTapeNameFromFile(filePath);
      if (!existingTapeName) {
        console.log('[MetadataWriter] Writing TapeName (blank):', structured.cameraId);
        args.push(`-XMP-xmpDM:TapeName=${structured.cameraId}`);
      } else {
        console.log('[MetadataWriter] Skipping TapeName write (existing value):', existingTapeName);
      }
    }

    // XMP-xmpDM:LogComment = Structured key=value pairs for CEP panel parsing
    // FIX: MOV/QuickTime files don't overwrite LogComment by default
    // Solution: Clear field first (empty value), then write new value in same command
    if (structured) {
      console.log('[MetadataWriter] Structured input received:', structured);
      const logCommentParts: string[] = [];

      if (structured.location) {
        logCommentParts.push(`location=${structured.location}`);
      }
      if (structured.subject) {
        logCommentParts.push(`subject=${structured.subject}`);
      }
      if (structured.action) {
        logCommentParts.push(`action=${structured.action}`);
      }
      if (structured.shotType) {
        logCommentParts.push(`shotType=${structured.shotType}`);
      }
      if (structured.date) {
        logCommentParts.push(`date=${structured.date}`);
      }
      if (structured.shotNumber) {
        logCommentParts.push(`shotNumber=${structured.shotNumber}`);
      }

      console.log('[MetadataWriter] LogComment parts built:', logCommentParts);

      if (logCommentParts.length > 0) {
        const logCommentValue = logCommentParts.join(', ');
        console.log('[MetadataWriter] Writing LogComment:', logCommentValue);

        // CRITICAL FIX: Clear LogComment first to ensure overwrite in MOV files
        // exiftool processes args sequentially: delete → write in single invocation
        args.push('-XMP-xmpDM:LogComment=');  // Clear existing value
        args.push(`-XMP-xmpDM:LogComment=${logCommentValue}`);  // Write new value
      } else {
        console.warn('[MetadataWriter] ⚠️  No LogComment parts to write (all fields empty or missing)');
      }
    } else {
      console.warn('[MetadataWriter] ⚠️  No structured data provided - LogComment will not be written');
    }

    // XMP-dc:Description = Keywords OR custom description (searchable)
    const descriptionValue = description || (tags.length > 0 ? tags.join(', ') : undefined);
    if (descriptionValue) {
      args.push(`-Description=${descriptionValue}`);
      args.push(`-XMP-dc:Description=${descriptionValue}`);
    }

    // Don't create backup files
    args.push('-overwrite_original');

    // Add file path
    args.push(filePath);

    // RESILIENCE: Clean up orphaned exiftool temp files from previous crashes
    // exiftool creates temporary files with _exiftool_tmp suffix during writes
    // If app crashes during write, these files are left behind and block future writes
    const tempFilePath = `${filePath}_exiftool_tmp`;
    if (existsSync(tempFilePath)) {
      console.warn('[MetadataWriter] ⚠️  Orphaned exiftool temp file detected, cleaning up:', tempFilePath);
      try {
        unlinkSync(tempFilePath);
        console.log('[MetadataWriter] ✓ Orphaned temp file removed');
      } catch (cleanupError) {
        console.error('[MetadataWriter] Failed to remove orphaned temp file:', cleanupError);
        // Continue anyway - exiftool might still succeed or provide better error
      }
    }

    try {
      // SECURITY: execFile() prevents shell injection
      // Arguments passed as array (no shell expansion)
      const exiftoolPath = findExiftool();

      // Log the complete exiftool command for debugging
      console.log('[MetadataWriter] Executing exiftool command:');
      console.log('[MetadataWriter]   Path:', exiftoolPath);
      console.log('[MetadataWriter]   Args:', args);

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
   * Matches the PP native field strategy (Issue #54):
   * - Reads XMP-xmpDM:shotName (maps to PP Shot field)
   * - Reads dc:Description (contains keywords comma-separated)
   * - Parses Description back into keywords array for backward compatibility
   *
   * @param filePath Absolute path to media file
   * @returns Object with title, keywords (parsed from description), and description
   */
  async readMetadataFromFile(filePath: string): Promise<{
    title?: string;
    keywords?: string[];
    description?: string;
  }> {
    try {
      const args = ['-XMP-xmpDM:shotName', '-Description', '-json', filePath];
      const exiftoolPath = findExiftool();

      const { stdout } = await execFileAsync(exiftoolPath, args, {
        timeout: 30000,
        maxBuffer: 10 * 1024 * 1024
      });

      const data = JSON.parse(stdout);

      if (data && data.length > 0) {
        const metadata = data[0];

        // Parse keywords from Description field (comma-separated)
        // This maintains backward compatibility with code expecting keywords array
        const keywords = metadata.Description
          ? this.parseKeywords(metadata.Description)
          : [];

        return {
          title: metadata.ShotName,
          keywords,
          description: metadata.Description,
        };
      }

      return {};
    } catch (error) {
      console.error('Failed to read metadata from file:', error);
      return {};
    }
  }

  /**
   * Extract creation timestamp from media file using exiftool.
   *
   * Tries multiple timestamp fields in order of preference:
   * 1. DateTimeOriginal (EXIF standard for original capture time)
   * 2. CreateDate (common in many formats)
   * 3. MediaCreateDate (video files)
   * 4. CreationDate (some video formats)
   * 5. TrackCreateDate (QuickTime/MP4)
   *
   * @param filePath Absolute path to media file
   * @returns Creation timestamp as Date object, or undefined if not found
   */
  async readCreationTimestamp(filePath: string): Promise<Date | undefined> {
    try {
      const args = [
        '-DateTimeOriginal',
        '-CreateDate',
        '-MediaCreateDate',
        '-CreationDate',
        '-TrackCreateDate',
        '-d', '%Y:%m:%d %H:%M:%S', // Format output consistently
        '-json',
        filePath
      ];
      const exiftoolPath = findExiftool();

      const { stdout } = await execFileAsync(exiftoolPath, args, {
        timeout: 30000,
        maxBuffer: 10 * 1024 * 1024
      });

      const data = JSON.parse(stdout);

      if (data && data.length > 0) {
        const metadata = data[0];

        // Try fields in order of preference
        const timestampString =
          metadata.DateTimeOriginal ||
          metadata.CreateDate ||
          metadata.MediaCreateDate ||
          metadata.CreationDate ||
          metadata.TrackCreateDate;

        if (timestampString) {
          // Parse EXIF timestamp format (YYYY:MM:DD HH:MM:SS)
          const parsed = this.parseExifTimestamp(timestampString);
          if (parsed) {
            return parsed;
          }
        }
      }

      return undefined;
    } catch (error) {
      console.error('Failed to read creation timestamp from file:', error);
      return undefined;
    }
  }

  /**
   * Parse EXIF timestamp string to Date object.
   * EXIF format: "YYYY:MM:DD HH:MM:SS"
   *
   * @param timestamp EXIF timestamp string
   * @returns Date object or undefined if parsing fails
   */
  private parseExifTimestamp(timestamp: string): Date | undefined {
    try {
      // EXIF format: "YYYY:MM:DD HH:MM:SS"
      const match = timestamp.match(/^(\d{4}):(\d{2}):(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/);
      if (!match) {
        return undefined;
      }

      const [, year, month, day, hour, minute, second] = match;
      const date = new Date(
        parseInt(year, 10),
        parseInt(month, 10) - 1, // Month is 0-indexed in JS
        parseInt(day, 10),
        parseInt(hour, 10),
        parseInt(minute, 10),
        parseInt(second, 10)
      );

      // Validate date is reasonable
      if (isNaN(date.getTime())) {
        return undefined;
      }

      return date;
    } catch (error) {
      console.error('Failed to parse EXIF timestamp:', error);
      return undefined;
    }
  }
}
