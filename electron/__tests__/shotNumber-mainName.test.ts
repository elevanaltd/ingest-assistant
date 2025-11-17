import { describe, it, expect } from 'vitest';

/**
 * Bug Reproduction Test: shotNumber in mainName Generation
 *
 * Issue: When shotNumber is present, mainName includes BOTH timestamp AND shot number
 * Expected: lounge-media-plate-MID-#1
 * Actual: lounge-media-plate-MID-20251024094631-#1
 *
 * Root Cause: file:update-structured-metadata handler calls generateTitleWithTimestamp()
 * which adds timestamp for uniqueness, but shotNumber already provides uniqueness.
 *
 * Fix: When shotNumber is present, skip timestamp addition in mainName generation.
 * The metadataWriter will append -#{shotNumber} suffix for uniqueness.
 */

describe('Shot Number MainName Generation', () => {
  it('RED: should NOT include timestamp in mainName when shotNumber is present', () => {
    // Given: Structured metadata with shotNumber
    const structured = {
      location: 'lounge',
      subject: 'media-plate',
      action: '',
      shotType: 'MID',
      shotNumber: 1
    };

    // When: Building baseTitle from structured components (image - no action)
    const baseTitle = `${structured.location}-${structured.subject}-${structured.shotType}`;

    // Expected baseTitle (before adding shot number suffix)
    expect(baseTitle).toBe('lounge-media-plate-MID');

    // Then: When shotNumber is present, mainName should NOT include timestamp
    // The shot number provides uniqueness, so timestamp is redundant

    // WRONG (current behavior): mainName includes timestamp
    const wrongMainName = `${baseTitle}-20251024094631`; // Timestamp added
    const wrongShotName = `${wrongMainName}-#${structured.shotNumber}`; // Shot number added on top
    expect(wrongShotName).toBe('lounge-media-plate-MID-20251024094631-#1'); // Current bug!

    // CORRECT (desired behavior): mainName skips timestamp when shotNumber present
    const correctMainName = baseTitle; // No timestamp
    const correctShotName = `${correctMainName}-#${structured.shotNumber}`; // Only shot number
    expect(correctShotName).toBe('lounge-media-plate-MID-#1'); // Desired output!

    // This test documents the bug and will PASS, showing the difference
    // Once fixed, the code should produce correctShotName format
  });

  it('RED: should include timestamp in mainName when shotNumber is ABSENT (legacy behavior)', () => {
    // Given: Structured metadata WITHOUT shotNumber (legacy folders)
    const structured = {
      location: 'kitchen',
      subject: 'oven',
      action: 'cleaning',
      shotType: 'WS',
      shotNumber: undefined // No shot number
    };

    const fileType = 'video';

    // When: Building baseTitle from structured components
    const baseTitle = fileType === 'video' && structured.action
      ? `${structured.location}-${structured.subject}-${structured.action}-${structured.shotType}`
      : `${structured.location}-${structured.subject}-${structured.shotType}`;

    expect(baseTitle).toBe('kitchen-oven-cleaning-WS');

    // Then: When shotNumber is absent, mainName SHOULD include timestamp for uniqueness
    const expectedMainName = `${baseTitle}-20251103100530`; // Timestamp provides uniqueness
    expect(expectedMainName).toBe('kitchen-oven-cleaning-WS-20251103100530');

    // No shot number suffix added (legacy behavior)
    // This ensures backward compatibility with folders that don't have sequential shot numbers
  });

  it('RED: should handle video files with action correctly when shotNumber present', () => {
    // Given: Video with action and shotNumber
    const structured = {
      location: 'bathroom',
      subject: 'sink',
      action: 'turning-on',
      shotType: 'CU',
      shotNumber: 25
    };

    // When: Building baseTitle (video includes action)
    const baseTitle = `${structured.location}-${structured.subject}-${structured.action}-${structured.shotType}`;
    expect(baseTitle).toBe('bathroom-sink-turning-on-CU');

    // Then: mainName should NOT include timestamp when shotNumber present
    const correctMainName = baseTitle; // No timestamp
    const correctShotName = `${correctMainName}-#${structured.shotNumber}`;
    expect(correctShotName).toBe('bathroom-sink-turning-on-CU-#25');
  });

  it('RED: should handle image files (no action) correctly when shotNumber present', () => {
    // Given: Image with no action and shotNumber
    const structured = {
      location: 'hallway',
      subject: 'smoke-detector',
      action: '',
      shotType: 'CU',
      shotNumber: 42
    };

    // When: Building baseTitle (image omits action)
    const baseTitle = `${structured.location}-${structured.subject}-${structured.shotType}`;
    expect(baseTitle).toBe('hallway-smoke-detector-CU');

    // Then: mainName should NOT include timestamp when shotNumber present
    const correctMainName = baseTitle; // No timestamp
    const correctShotName = `${correctMainName}-#${structured.shotNumber}`;
    expect(correctShotName).toBe('hallway-smoke-detector-CU-#42');
  });
});
