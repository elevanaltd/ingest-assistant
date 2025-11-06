export type SecurityViolationType =
  | 'PATH_TRAVERSAL'
  | 'INVALID_CONTENT'
  | 'SIZE_EXCEEDED'
  | 'INVALID_EXTENSION'
  | 'SUSPICIOUS_PATTERN';

export class SecurityViolationError extends Error {
  constructor(
    public readonly type: SecurityViolationType,
    public readonly filePath: string,
    public readonly details: string
  ) {
    super(`Security violation (${type}): ${details}`);
    this.name = 'SecurityViolationError';
  }
}
