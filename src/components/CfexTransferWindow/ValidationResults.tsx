/**
 * ValidationResults Component (Extracted Phase 8a)
 *
 * Presentational component for CFEx transfer validation warnings and errors.
 *
 * Features:
 * - Displays validation warnings (yellow background)
 * - Displays transfer errors (red background)
 * - Returns null when no warnings or errors (invisible)
 *
 * System Ripples:
 * - Pure presentational component (no side effects)
 * - No context consumption (parent passes all state)
 *
 * MIP Compliance:
 * - ESSENTIAL: Validation feedback for user awareness
 * - MINIMAL: No local state, pure render from props
 */

interface ValidationWarning {
  file: string
  message: string
  severity: 'low' | 'medium' | 'high'
}

interface TransferError {
  file: string
  error: Error
  phase: 'scan' | 'transfer' | 'validation'
}

export interface ValidationResultsProps {
  warnings: ValidationWarning[]
  errors: TransferError[]
}

export function ValidationResults({ warnings, errors }: ValidationResultsProps) {
  if (warnings.length === 0 && errors.length === 0) return null

  return (
    <div style={{ marginTop: '20px' }}>
      {warnings.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <h3 style={{ fontSize: '14px', marginBottom: '8px' }}>Warnings</h3>
          {warnings.map((warning, index) => (
            <div key={index} style={{ padding: '8px', backgroundColor: '#fff3cd', borderRadius: '4px', marginBottom: '4px', fontSize: '13px' }}>
              <strong>{warning.file}:</strong> {warning.message}
            </div>
          ))}
        </div>
      )}

      {errors.length > 0 && (
        <div>
          <h3 style={{ fontSize: '14px', marginBottom: '8px' }}>Errors</h3>
          {errors.map((error, index) => (
            <div key={index} style={{ padding: '8px', backgroundColor: '#f8d7da', borderRadius: '4px', marginBottom: '4px', fontSize: '13px' }}>
              <strong>{error.file || 'Unknown'}:</strong> {error.error.message}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
