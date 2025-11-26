/**
 * FilenameTemplateParser - Secure filename generation from templates
 *
 * Security Features:
 * - Command injection prevention (shell metacharacter blocking)
 * - Path traversal prevention (../, /, \ blocking)
 * - Input sanitization (whitelist safe characters)
 * - Length validation (255 character limit)
 *
 * Template Syntax:
 * - Fields: {subject}, {location}, {action}, {shotType}, {shotNumber}, {cameraId}
 * - Static text allowed: "prefix-{subject}-suffix"
 * - Example: "{location}-{subject}-{shotType}" → "kitchen-oven-CU"
 *
 * Phase 1c Power Features - CFEx Integration
 * Issue: Filename rewrite toggle + template customization
 */

/**
 * Custom error for security violations
 * Thrown when input contains shell metacharacters or path traversal attempts
 */
export class SecurityViolationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SecurityViolationError';
  }
}

/**
 * Template field values for filename generation
 */
export interface TemplateFields {
  subject?: string;
  location?: string;
  action?: string;
  shotType?: string;
  shotNumber?: string | number;
  cameraId?: string;
}

/**
 * Filename preview showing before/after rename
 */
export interface FilenamePreview {
  /** Original filename */
  before: string;
  /** Generated filename from template */
  after: string;
  /** File extension (includes dot: ".JPG") */
  extension: string;
  /** Whether this filename conflicts with another in batch */
  hasConflict?: boolean;
  /** List of filenames this conflicts with */
  conflictWith?: string[];
}

/**
 * Template validation result
 */
export interface TemplateValidation {
  /** Whether template is valid */
  valid: boolean;
  /** List of validation errors */
  errors: string[];
}

/**
 * Secure filename template parser with command injection prevention
 *
 * SECURITY HARDENING (B0 validation requirement):
 * - BLOCKS shell metacharacters: ; | & $ ` \n < > { } !
 * - BLOCKS path traversal: ../ / \
 * - WHITELISTS safe characters: a-zA-Z0-9._-
 * - ENFORCES length limit: 255 characters
 *
 * MINIMAL INTERVENTION PRINCIPLE:
 * - Essential complexity: Prevents arbitrary code execution via filename injection
 * - User value: Safe filename customization without security risks
 * - Existing extension: No existing filename templating in codebase
 * - Simplification test: Cannot remove validation without security vulnerability
 */
export class FilenameTemplateParser {
  // Whitelist of safe characters in filenames
  private readonly SAFE_CHARS = /^[a-zA-Z0-9._-]+$/;

  // Shell metacharacters that indicate injection attempt
  // Based on OWASP Command Injection Prevention Cheat Sheet
  private readonly SHELL_METACHARACTERS = /[;|&$`\n<>{}!]/;

  // Maximum field value length (filesystem limit)
  private readonly MAX_LENGTH = 255;

  // Valid template field names
  private readonly VALID_FIELDS = new Set([
    'subject',
    'location',
    'action',
    'shotType',
    'shotNumber',
    'cameraId'
  ]);

  /**
   * Sanitize field value to safe characters
   *
   * SECURITY CHECKS (in order):
   * 1. Shell metacharacter blocking (command injection prevention)
   * 2. Path traversal blocking (directory escape prevention)
   * 3. Whitelist sanitization (remove all unsafe characters)
   * 4. Length validation (prevent buffer overflow)
   *
   * @param value Field value to sanitize
   * @param fieldName Field name for error messages
   * @returns Sanitized value with only safe characters
   * @throws SecurityViolationError if value contains shell metacharacters or path traversal
   */
  private sanitizeFieldValue(value: string | number, fieldName: string): string {
    // Convert to string
    const strValue = String(value);

    // SECURITY CHECK 1: Block shell metacharacters (command injection)
    if (this.SHELL_METACHARACTERS.test(strValue)) {
      throw new SecurityViolationError(
        `Shell metacharacters not allowed in ${fieldName}`
      );
    }

    // SECURITY CHECK 2: Block path traversal
    if (strValue.includes('..') || strValue.includes('/') || strValue.includes('\\')) {
      throw new SecurityViolationError(
        `Path traversal not allowed in ${fieldName}`
      );
    }

    // SECURITY CHECK 3: Whitelist safe characters (remove everything else)
    const sanitized = strValue.replace(/[^a-zA-Z0-9._-]/g, '');

    // SECURITY CHECK 4: Length validation
    if (sanitized.length > this.MAX_LENGTH) {
      throw new Error(`Field value exceeds ${this.MAX_LENGTH} characters`);
    }

    return sanitized;
  }

  /**
   * Parse template string and substitute field values
   *
   * Template syntax: {fieldName}
   * Example: "{location}-{subject}-{shotType}" with fields {location: "kitchen", subject: "oven", shotType: "CU"}
   * Result: "kitchen-oven-CU"
   *
   * @param template Template string with placeholders
   * @param fields Field values to substitute
   * @returns Generated filename (without extension)
   * @throws SecurityViolationError if any field value contains unsafe characters
   * @throws Error if template is invalid or field is missing
   */
  parse(template: string, fields: TemplateFields): string {
    // Validate template not empty
    if (!template || template.trim().length === 0) {
      throw new Error('Template cannot be empty');
    }

    // Extract field placeholders from template
    const placeholderRegex = /\{(\w+)\}/g;
    const placeholders = Array.from(template.matchAll(placeholderRegex));

    // Validate all field names are known
    for (const match of placeholders) {
      const fieldName = match[1];
      if (!this.VALID_FIELDS.has(fieldName)) {
        throw new Error(`Unknown template field: ${fieldName}`);
      }
    }

    // Substitute each placeholder with sanitized field value
    let result = template;

    for (const match of placeholders) {
      const fieldName = match[0]; // Full match: "{subject}"
      const fieldKey = match[1] as keyof TemplateFields; // Field name: "subject"

      const fieldValue = fields[fieldKey];

      // Check field value exists and is not null/undefined
      if (fieldValue === null || fieldValue === undefined) {
        throw new Error(`Field value cannot be null or undefined: ${fieldKey}`);
      }

      // Sanitize field value (security validation)
      const sanitized = this.sanitizeFieldValue(fieldValue, fieldKey);

      // Replace placeholder with sanitized value
      result = result.replace(fieldName, sanitized);
    }

    return result;
  }

  /**
   * Generate filename preview showing before/after
   *
   * Preserves file extension from original filename.
   *
   * @param template Template string
   * @param originalFilename Original filename with extension
   * @param fields Field values
   * @returns Preview object with before/after filenames
   */
  generatePreview(
    template: string,
    originalFilename: string,
    fields: TemplateFields
  ): FilenamePreview {
    // Extract extension
    const lastDot = originalFilename.lastIndexOf('.');
    const extension = lastDot >= 0 ? originalFilename.substring(lastDot) : '';

    // Generate new filename (without extension)
    const newBasename = this.parse(template, fields);

    // Combine with extension
    const newFilename = extension ? `${newBasename}${extension}` : newBasename;

    return {
      before: originalFilename,
      after: newFilename,
      extension
    };
  }

  /**
   * Generate previews for multiple files and detect naming conflicts
   *
   * Conflict detection: If multiple files generate the same filename,
   * mark them as conflicts with list of conflicting filenames.
   *
   * @param template Template string
   * @param files Array of file objects with currentFilename and field values
   * @returns Array of preview objects with conflict detection
   */
  generateBatchPreview(
    template: string,
    files: Array<{ currentFilename: string } & TemplateFields>
  ): FilenamePreview[] {
    // Generate all previews first
    const previews = files.map(file =>
      this.generatePreview(template, file.currentFilename, file)
    );

    // Build map of generated filename → original filenames
    const filenameMap = new Map<string, string[]>();

    for (let i = 0; i < previews.length; i++) {
      const preview = previews[i];
      const originalFilename = files[i].currentFilename;

      if (!filenameMap.has(preview.after)) {
        filenameMap.set(preview.after, []);
      }

      filenameMap.get(preview.after)!.push(originalFilename);
    }

    // Mark conflicts (same generated filename for multiple files)
    for (let i = 0; i < previews.length; i++) {
      const preview = previews[i];
      const originalFilename = files[i].currentFilename;

      const conflictList = filenameMap.get(preview.after)!;

      if (conflictList.length > 1) {
        preview.hasConflict = true;
        // List all other files that conflict (excluding self)
        preview.conflictWith = conflictList.filter(f => f !== originalFilename);
      }
    }

    return previews;
  }

  /**
   * Validate template syntax
   *
   * Checks for:
   * - Unknown field names
   * - Unclosed placeholders
   * - Empty template
   *
   * @param template Template string to validate
   * @returns Validation result with errors
   */
  validateTemplate(template: string): TemplateValidation {
    const errors: string[] = [];

    // Check empty template
    if (!template || template.trim().length === 0) {
      errors.push('Template cannot be empty');
      return { valid: false, errors };
    }

    // Check for unclosed placeholders
    const openBraces = (template.match(/\{/g) || []).length;
    const closeBraces = (template.match(/\}/g) || []).length;

    if (openBraces !== closeBraces) {
      errors.push('Template has unclosed placeholders');
    }

    // Extract and validate field names
    const placeholderRegex = /\{(\w+)\}/g;
    const placeholders = Array.from(template.matchAll(placeholderRegex));

    for (const match of placeholders) {
      const fieldName = match[1];

      if (!this.VALID_FIELDS.has(fieldName)) {
        errors.push(`Unknown template field: ${fieldName}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
