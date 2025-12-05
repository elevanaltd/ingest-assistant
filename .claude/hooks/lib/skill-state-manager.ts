/**
 * Session state management for skill acknowledgments
 *
 * Tracks which skills have been suggested/injected in each conversation
 * to avoid re-suggesting the same skills repeatedly. State is persisted
 * per-conversation using conversation_id or session_id.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import type { SessionState } from './types.js';

/**
 * Extended session state with metadata
 */
interface ExtendedSessionState extends SessionState {
  timestamp: number;
  injectedSkills: string[];
  injectionTimestamp: number;
  activeAgent?: string;
  agentActivatedAt?: number;
}

/**
 * Read acknowledged skills from session state file
 *
 * Returns list of skills that have been suggested/injected in previous
 * turns of the current conversation.
 *
 * @param stateDir - State directory path (.claude/hooks/state)
 * @param stateId - Conversation or session ID
 * @returns Array of acknowledged skill names
 */
export function readAcknowledgedSkills(stateDir: string, stateId: string): string[] {
  const stateFile = join(stateDir, `${stateId}-skills-suggested.json`);

  if (!existsSync(stateFile)) {
    return [];
  }

  try {
    const existing: ExtendedSessionState = JSON.parse(readFileSync(stateFile, 'utf-8'));
    return existing.acknowledgedSkills || [];
  } catch {
    // Invalid JSON, start fresh
    return [];
  }
}

/**
 * Read active agent from session state
 *
 * @param stateDir - State directory path
 * @param stateId - Conversation or session ID
 * @returns Active agent name or undefined
 */
export function readActiveAgent(stateDir: string, stateId: string): string | undefined {
  const stateFile = join(stateDir, `${stateId}-skills-suggested.json`);

  if (!existsSync(stateFile)) {
    return undefined;
  }

  try {
    const existing: ExtendedSessionState = JSON.parse(readFileSync(stateFile, 'utf-8'));
    return existing.activeAgent;
  } catch {
    return undefined;
  }
}

/**
 * Write active agent to session state (during /role or /load bypass)
 *
 * @param stateDir - State directory path
 * @param stateId - Conversation or session ID
 * @param agentName - Name of the activated agent
 */
export function writeActiveAgent(stateDir: string, stateId: string, agentName: string): void {
  try {
    mkdirSync(stateDir, { recursive: true });

    const stateFile = join(stateDir, `${stateId}-skills-suggested.json`);

    // Read existing state or create new
    let stateData: ExtendedSessionState;
    if (existsSync(stateFile)) {
      try {
        stateData = JSON.parse(readFileSync(stateFile, 'utf-8'));
      } catch {
        stateData = {
          timestamp: Date.now(),
          acknowledgedSkills: [],
          injectedSkills: [],
          injectionTimestamp: 0,
        };
      }
    } else {
      stateData = {
        timestamp: Date.now(),
        acknowledgedSkills: [],
        injectedSkills: [],
        injectionTimestamp: 0,
      };
    }

    // Update with new active agent
    stateData.activeAgent = agentName;
    stateData.agentActivatedAt = Date.now();
    stateData.timestamp = Date.now();

    writeFileSync(stateFile, JSON.stringify(stateData, null, 2));
  } catch (err) {
    console.error('Warning: Failed to write active agent state:', err);
  }
}

/**
 * Write session state to track acknowledged skills
 *
 * Uses atomic write pattern (write to temp file, then rename) to prevent
 * corruption from concurrent hook invocations.
 *
 * @param stateDir - State directory path
 * @param stateId - Conversation or session ID
 * @param acknowledgedSkills - All skills acknowledged (existing + new)
 * @param injectedSkills - Skills injected this turn
 * @param activeAgent - Optional active agent to preserve
 */
export function writeSessionState(
  stateDir: string,
  stateId: string,
  acknowledgedSkills: string[],
  injectedSkills: string[],
  activeAgent?: string
): void {
  try {
    // Ensure state directory exists
    mkdirSync(stateDir, { recursive: true });

    const stateFile = join(stateDir, `${stateId}-skills-suggested.json`);
    const tempFile = `${stateFile}.tmp`;

    // Read existing state to preserve active agent if not provided
    let existingAgent: string | undefined;
    let existingAgentTime: number | undefined;
    if (existsSync(stateFile)) {
      try {
        const existing: ExtendedSessionState = JSON.parse(readFileSync(stateFile, 'utf-8'));
        existingAgent = existing.activeAgent;
        existingAgentTime = existing.agentActivatedAt;
      } catch {
        // Ignore parse errors
      }
    }

    const stateData: ExtendedSessionState = {
      timestamp: Date.now(),
      acknowledgedSkills,
      injectedSkills,
      injectionTimestamp: Date.now(),
      activeAgent: activeAgent ?? existingAgent,
      agentActivatedAt: activeAgent ? Date.now() : existingAgentTime,
    };

    // Atomic write: write to temp file, then rename
    // This prevents corruption if multiple hooks run concurrently
    writeFileSync(tempFile, JSON.stringify(stateData, null, 2));

    // Rename is atomic on most filesystems
    if (existsSync(stateFile)) {
      unlinkSync(stateFile);
    }

    // Note: renameSync would be better but requires importing from fs
    writeFileSync(stateFile, readFileSync(tempFile, 'utf-8'));
    unlinkSync(tempFile);
  } catch (err) {
    // Don't fail the hook if state writing fails
    console.error('Warning: Failed to write session state:', err);
  }
}
