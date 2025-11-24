/**
 * CFEx Card Auto-Detection Service
 *
 * RED PHASE STUB - This file exists only to satisfy TypeScript compilation
 * during RED phase of TDD. Implementation will be added in GREEN phase.
 *
 * DO NOT implement behavior here - tests should fail for the right reason
 * (missing implementation logic, not missing module).
 */

export interface CfexDestinations {
  photos: string;
  rawVideos: string;
}

export class CfexAutoDetect {
  /**
   * Detect CFEx cards mounted on the system
   * Platform-aware: macOS scans /Volumes/, Ubuntu scans /media/ + /run/media/
   *
   * @returns Array of CFEx card mount paths (e.g., ['/Volumes/NO NAME'])
   *
   * RED PHASE: Not implemented - tests should fail
   */
  async detectCfexCards(): Promise<string[]> {
    throw new Error('Not implemented - RED phase stub');
  }

  /**
   * Detect default destination paths for photos and raw videos
   *
   * @returns Object with photos and rawVideos paths
   *
   * RED PHASE: Not implemented - tests should fail
   */
  async detectDestinations(): Promise<CfexDestinations> {
    throw new Error('Not implemented - RED phase stub');
  }

  /**
   * Determine if UI should auto-populate based on number of cards detected
   *
   * @param cards - Array of detected CFEx card paths
   * @returns true if exactly 1 card detected, false otherwise
   *
   * RED PHASE: Not implemented - tests should fail
   */
  shouldAutoPopulate(cards: string[]): boolean {
    throw new Error('Not implemented - RED phase stub');
  }

  /**
   * Get the selected card from array
   *
   * @param cards - Array of detected CFEx card paths
   * @returns First card in array
   *
   * RED PHASE: Not implemented - tests should fail
   */
  getSelectedCard(cards: string[]): string {
    throw new Error('Not implemented - RED phase stub');
  }

  /**
   * Check if a path is accessible (exists and readable)
   *
   * @param path - Path to validate
   * @returns true if accessible, false otherwise
   *
   * RED PHASE: Not implemented - tests should fail
   */
  async isPathAccessible(path: string): Promise<boolean> {
    throw new Error('Not implemented - RED phase stub');
  }
}
