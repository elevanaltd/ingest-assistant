import { describe, it, expect, beforeEach } from 'vitest';
import { FilenameTemplateParser, SecurityViolationError } from '../filenameTemplate';

describe('FilenameTemplateParser - Security Hardening', () => {
  let parser: FilenameTemplateParser;

  beforeEach(() => {
    parser = new FilenameTemplateParser();
  });

  describe('Command Injection Prevention', () => {
    it('should BLOCK command injection via semicolon', () => {
      const maliciousSubject = 'oven; rm -rf /';

      expect(() =>
        parser.parse('{subject}', { subject: maliciousSubject })
      ).toThrow(SecurityViolationError);

      expect(() =>
        parser.parse('{subject}', { subject: maliciousSubject })
      ).toThrow('Shell metacharacters not allowed');
    });

    it('should BLOCK command substitution with $()', () => {
      const maliciousSubject = '$(whoami)';

      expect(() =>
        parser.parse('{subject}', { subject: maliciousSubject })
      ).toThrow(SecurityViolationError);

      expect(() =>
        parser.parse('{subject}', { subject: maliciousSubject })
      ).toThrow('Shell metacharacters not allowed');
    });

    it('should BLOCK backtick command substitution', () => {
      const maliciousSubject = '`whoami`';

      expect(() =>
        parser.parse('{subject}', { subject: maliciousSubject })
      ).toThrow(SecurityViolationError);

      expect(() =>
        parser.parse('{subject}', { subject: maliciousSubject })
      ).toThrow('Shell metacharacters not allowed');
    });

    it('should BLOCK pipe command chaining', () => {
      const maliciousSubject = 'oven | cat /etc/passwd';

      expect(() =>
        parser.parse('{subject}', { subject: maliciousSubject })
      ).toThrow(SecurityViolationError);
    });

    it('should BLOCK ampersand background execution', () => {
      const maliciousSubject = 'oven & curl attacker.com &';

      expect(() =>
        parser.parse('{subject}', { subject: maliciousSubject })
      ).toThrow(SecurityViolationError);
    });

    it('should BLOCK newline injection', () => {
      const maliciousSubject = 'oven\nmalicious-command';

      expect(() =>
        parser.parse('{subject}', { subject: maliciousSubject })
      ).toThrow(SecurityViolationError);
    });

    it('should BLOCK angle bracket redirection', () => {
      const maliciousSubject = 'oven > /tmp/evil.txt';

      expect(() =>
        parser.parse('{subject}', { subject: maliciousSubject })
      ).toThrow(SecurityViolationError);
    });

    it('should BLOCK curly brace expansion', () => {
      const maliciousSubject = 'oven{a,b,c}';

      expect(() =>
        parser.parse('{subject}', { subject: maliciousSubject })
      ).toThrow(SecurityViolationError);
    });

    it('should BLOCK exclamation mark (history expansion)', () => {
      const maliciousSubject = 'oven!previous-command';

      expect(() =>
        parser.parse('{subject}', { subject: maliciousSubject })
      ).toThrow(SecurityViolationError);
    });
  });

  describe('Path Traversal Prevention', () => {
    it('should BLOCK parent directory traversal with ../', () => {
      const maliciousSubject = '../../../etc/passwd';

      expect(() =>
        parser.parse('{subject}', { subject: maliciousSubject })
      ).toThrow(SecurityViolationError);

      expect(() =>
        parser.parse('{subject}', { subject: maliciousSubject })
      ).toThrow('Path traversal not allowed');
    });

    it('should BLOCK forward slash path separator', () => {
      const maliciousSubject = 'oven/subfolder/file';

      expect(() =>
        parser.parse('{subject}', { subject: maliciousSubject })
      ).toThrow(SecurityViolationError);

      expect(() =>
        parser.parse('{subject}', { subject: maliciousSubject })
      ).toThrow('Path traversal not allowed');
    });

    it('should BLOCK backslash path separator (Windows)', () => {
      const maliciousSubject = 'oven\\subfolder\\file';

      expect(() =>
        parser.parse('{subject}', { subject: maliciousSubject })
      ).toThrow(SecurityViolationError);

      expect(() =>
        parser.parse('{subject}', { subject: maliciousSubject })
      ).toThrow('Path traversal not allowed');
    });

    it('should BLOCK dot-dot in middle of path', () => {
      const maliciousSubject = 'valid..invalid';

      expect(() =>
        parser.parse('{subject}', { subject: maliciousSubject })
      ).toThrow(SecurityViolationError);

      expect(() =>
        parser.parse('{subject}', { subject: maliciousSubject })
      ).toThrow('Path traversal not allowed');
    });
  });

  describe('Input Sanitization', () => {
    it('should SANITIZE special characters to safe output', () => {
      const unsafeSubject = 'oven@home';

      const result = parser.parse('{subject}-{shotNumber}', {
        subject: unsafeSubject,
        shotNumber: '5'
      });

      // Should strip @ (not a shell metacharacter, just unsafe for filenames)
      expect(result).toBe('ovenhome-5');
    });

    it('should PRESERVE safe characters (alphanumeric, hyphen, underscore, dot)', () => {
      const safeSubject = 'oven-steam_tray.v2';

      const result = parser.parse('{subject}', { subject: safeSubject });

      expect(result).toBe('oven-steam_tray.v2');
    });

    it('should SANITIZE spaces to empty string', () => {
      const subjectWithSpaces = 'oven steam tray';

      const result = parser.parse('{subject}', { subject: subjectWithSpaces });

      expect(result).toBe('ovensteamtray');
    });

    it('should ENFORCE length limit (255 characters)', () => {
      const tooLongSubject = 'a'.repeat(300);

      expect(() =>
        parser.parse('{subject}', { subject: tooLongSubject })
      ).toThrow('Field value exceeds 255 characters');
    });
  });

  describe('Template Parsing', () => {
    it('should parse simple template with one field', () => {
      const result = parser.parse('{subject}', { subject: 'oven' });

      expect(result).toBe('oven');
    });

    it('should parse template with multiple fields', () => {
      const result = parser.parse('{location}-{subject}-{shotType}', {
        location: 'kitchen',
        subject: 'oven',
        shotType: 'CU'
      });

      expect(result).toBe('kitchen-oven-CU');
    });

    it('should parse template with shot number', () => {
      const result = parser.parse('{subject}-{shotNumber}', {
        subject: 'oven',
        shotNumber: '42'
      });

      expect(result).toBe('oven-42');
    });

    it('should parse template with action field', () => {
      const result = parser.parse('{location}-{subject}-{action}-{shotType}', {
        location: 'kitchen',
        subject: 'oven',
        action: 'cleaning',
        shotType: 'WS'
      });

      expect(result).toBe('kitchen-oven-cleaning-WS');
    });

    it('should REJECT template with missing required field values', () => {
      expect(() =>
        parser.parse('{location}-{subject}-{action}', {
          location: 'kitchen',
          subject: 'oven'
          // action omitted - should throw
        })
      ).toThrow('Field value cannot be null or undefined');
    });

    it('should REJECT template with unknown fields', () => {
      expect(() =>
        parser.parse('{invalidField}', { subject: 'oven' })
      ).toThrow('Unknown template field: invalidField');
    });

    it('should SANITIZE all field values in complex template', () => {
      const result = parser.parse('{location}-{subject}-{shotType}', {
        location: 'kitchen@home',
        subject: 'oven#urgent',
        shotType: 'CU*special'
      });

      // All fields should be sanitized (@ # * are not shell metacharacters, just unsafe)
      expect(result).toBe('kitchenhome-ovenurgent-CUspecial');
    });
  });

  describe('Template String Security - Static Text Validation', () => {
    // BLOCKING Security Gap: Template static text is NOT validated
    // Field values are sanitized, but template string itself can contain malicious patterns

    it('should REJECT path traversal in template static text', () => {
      expect(() =>
        parser.parse('../{subject}', { subject: 'kitchen' })
      ).toThrow(SecurityViolationError);

      expect(() =>
        parser.parse('../{subject}', { subject: 'kitchen' })
      ).toThrow('Template contains dangerous characters');
    });

    it('should REJECT forward slash in template static text', () => {
      expect(() =>
        parser.parse('subdir/{subject}', { subject: 'kitchen' })
      ).toThrow(SecurityViolationError);

      expect(() =>
        parser.parse('subdir/{subject}', { subject: 'kitchen' })
      ).toThrow('Template contains dangerous characters');
    });

    it('should REJECT backslash in template static text (Windows)', () => {
      expect(() =>
        parser.parse('dir\\{subject}', { subject: 'kitchen' })
      ).toThrow(SecurityViolationError);

      expect(() =>
        parser.parse('dir\\{subject}', { subject: 'kitchen' })
      ).toThrow('Template contains dangerous characters');
    });

    it('should REJECT shell metacharacters in template static text - $()', () => {
      expect(() =>
        parser.parse('$(whoami)-{subject}', { subject: 'kitchen' })
      ).toThrow(SecurityViolationError);

      expect(() =>
        parser.parse('$(whoami)-{subject}', { subject: 'kitchen' })
      ).toThrow('Template contains dangerous characters');
    });

    it('should REJECT shell metacharacters in template static text - backtick', () => {
      expect(() =>
        parser.parse('`whoami`-{subject}', { subject: 'kitchen' })
      ).toThrow(SecurityViolationError);

      expect(() =>
        parser.parse('`whoami`-{subject}', { subject: 'kitchen' })
      ).toThrow('Template contains dangerous characters');
    });

    it('should REJECT shell metacharacters in template static text - semicolon', () => {
      expect(() =>
        parser.parse('prefix;rm -rf /-{subject}', { subject: 'kitchen' })
      ).toThrow(SecurityViolationError);

      expect(() =>
        parser.parse('prefix;rm -rf /-{subject}', { subject: 'kitchen' })
      ).toThrow('Template contains dangerous characters');
    });

    it('should REJECT shell metacharacters in template static text - pipe', () => {
      expect(() =>
        parser.parse('prefix|cat /etc/passwd-{subject}', { subject: 'kitchen' })
      ).toThrow(SecurityViolationError);

      expect(() =>
        parser.parse('prefix|cat /etc/passwd-{subject}', { subject: 'kitchen' })
      ).toThrow('Template contains dangerous characters');
    });

    it('should REJECT shell metacharacters in template static text - ampersand', () => {
      expect(() =>
        parser.parse('prefix&-{subject}', { subject: 'kitchen' })
      ).toThrow(SecurityViolationError);

      expect(() =>
        parser.parse('prefix&-{subject}', { subject: 'kitchen' })
      ).toThrow('Template contains dangerous characters');
    });

    it('should REJECT angle brackets in template static text', () => {
      expect(() =>
        parser.parse('prefix>output-{subject}', { subject: 'kitchen' })
      ).toThrow(SecurityViolationError);

      expect(() =>
        parser.parse('prefix<input-{subject}', { subject: 'kitchen' })
      ).toThrow(SecurityViolationError);
    });

    it('should REJECT null bytes in template static text', () => {
      expect(() =>
        parser.parse('prefix\x00-{subject}', { subject: 'kitchen' })
      ).toThrow(SecurityViolationError);

      expect(() =>
        parser.parse('prefix\x00-{subject}', { subject: 'kitchen' })
      ).toThrow('Template contains dangerous characters');
    });

    it('should ALLOW safe template with hyphens and underscores', () => {
      const result = parser.parse('{location}-{subject}_{action}', {
        location: 'kitchen',
        subject: 'oven',
        action: 'cleaning'
      });

      expect(result).toBe('kitchen-oven_cleaning');
    });

    it('should ALLOW safe template with prefix/suffix static text', () => {
      const result = parser.parse('prefix-{subject}-suffix', {
        subject: 'oven'
      });

      expect(result).toBe('prefix-oven-suffix');
    });

    it('should ALLOW template with dots in static text', () => {
      const result = parser.parse('v2.0-{subject}', {
        subject: 'oven'
      });

      expect(result).toBe('v2.0-oven');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty template string', () => {
      expect(() =>
        parser.parse('', { subject: 'oven' })
      ).toThrow('Template cannot be empty');
    });

    it('should handle template with no placeholders', () => {
      const result = parser.parse('static-filename', { subject: 'oven' });

      expect(result).toBe('static-filename');
    });

    it('should handle numeric field values', () => {
      const result = parser.parse('{shotNumber}', { shotNumber: 123 });

      expect(result).toBe('123');
    });

    it('should handle cameraId field', () => {
      const result = parser.parse('{cameraId}-{shotNumber}', {
        cameraId: 'EA001622',
        shotNumber: '5'
      });

      expect(result).toBe('EA001622-5');
    });

    it('should REJECT null field values', () => {
      expect(() =>
        parser.parse('{subject}', { subject: null as any })
      ).toThrow('Field value cannot be null or undefined');
    });

    it('should REJECT undefined field values', () => {
      expect(() =>
        parser.parse('{subject}', { subject: undefined as any })
      ).toThrow('Field value cannot be null or undefined');
    });
  });
});
