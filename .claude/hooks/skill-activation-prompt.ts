#!/usr/bin/env node
/**
 * Skill Activation Hook - Main Entry Point
 *
 * Orchestrates skill auto-loading using modular components.
 * Analyzes user prompts via AI, filters/promotes skills, and injects
 * skill content into the conversation context.
 */

// Load environment variables from .env file in hooks directory
// MUST be imported before other code runs
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Configure dotenv to load .env from the hooks directory
const hooksDir = dirname(fileURLToPath(import.meta.url));
const envPath = join(hooksDir, '.env');
const result = dotenv.config({ path: envPath });

// Debug: Log if .env was loaded (only when DEBUG_SKILL_HOOK is set)
if (process.env.DEBUG_SKILL_HOOK) {
  console.error('[skill-activation] Dotenv load result:', {
    envPath,
    success: result.error ? false : true,
    parsed: result.parsed ? Object.keys(result.parsed) : [],
    hasApiKey: !!process.env.ANTHROPIC_API_KEY,
  });
}

import { readFileSync } from 'fs';
import { analyzeIntent } from './lib/intent-analyzer.js';
import { resolveSkillDependencies } from './lib/skill-resolution.js';
import { filterAndPromoteSkills, findAffinityInjections } from './lib/skill-filtration.js';
import { readAcknowledgedSkills, readActiveAgent, writeActiveAgent, writeSessionState } from './lib/skill-state-manager.js';
import {
  injectSkillContent,
  formatActivationBanner,
  formatJustInjectedSection,
  formatAlreadyLoadedSection,
  formatRecommendedSection,
  formatClosingBanner,
} from './lib/output-formatter.js';
import type { SkillRulesConfig } from './lib/types.js';
import { debugLog } from './lib/debug-logger.js';

/**
 * Agent name aliases (same as in role.md and load.md)
 */
const AGENT_ALIASES: Record<string, string> = {
  'ce': 'critical-engineer',
  'ea': 'error-architect',
  'ta': 'technical-architect',
  'ca': 'completion-architect',
  'il': 'implementation-lead',
  'td': 'task-decomposer',
  'wa': 'workspace-architect',
  'ss': 'system-steward',
  'rs': 'requirements-steward',
  'ho': 'holistic-orchestrator',
  'tis': 'test-infrastructure-steward',
  'test-steward': 'test-infrastructure-steward',
  'tmg': 'test-methodology-guardian',
  'testguard': 'test-methodology-guardian',
  'crs': 'code-review-specialist',
  'cr': 'code-review-specialist',
  'ute': 'universal-test-engineer',
  'test': 'universal-test-engineer',
};

/**
 * Extract agent name from /role or /load command
 */
function extractAgentFromCommand(prompt: string): string | null {
  // Match /role or /load followed by agent name
  const roleMatch = prompt.match(/^\/role\s+(.+?)(?:\s+--|\s*$)/i);
  const loadMatch = prompt.match(/^\/load\s+(.+?)(?:\s+--|\s*$)/i);

  const match = roleMatch || loadMatch;
  if (!match) return null;

  // Clean and normalize agent name
  let agentName = match[1].trim().toLowerCase().replace(/\s+/g, '-');

  // Strip any remaining flags
  agentName = agentName.replace(/--\S+/g, '').trim();

  // Apply aliases
  if (AGENT_ALIASES[agentName]) {
    agentName = AGENT_ALIASES[agentName];
  }

  return agentName || null;
}

/**
 * Hook input from Claude
 */
interface HookInput {
  session_id: string;
  conversation_id?: string;
  transcript_path: string;
  cwd: string;
  permission_mode: string;
  prompt: string;
}

/**
 * Main hook execution
 */
async function main(): Promise<void> {
  try {
    // Read input from stdin
    const input = readFileSync(0, 'utf-8');
    const data: HookInput = JSON.parse(input);

    // ⚠️ BYPASS: Skip auto-injection for /role commands and RAPH processing
    // HestAI workflow: /role activation happens first (establishes constitutional identity)
    // Skills load in subsequent prompts to supplement agent, not dilute RAPH process
    const bypassPatterns = [
      /^\/role\s+/i,           // Role activation: /role system-steward
      /--raph\b/i,             // Explicit RAPH flag: /role ho --raph
      /^\/\w+/,                // All slash commands (general safety)
    ];

    if (bypassPatterns.some(pattern => pattern.test(data.prompt))) {
      debugLog(`[BYPASS] Role/command activation detected: "${data.prompt}"`);

      // Extract agent name from /role or /load and record to session state
      const agentName = extractAgentFromCommand(data.prompt);
      if (agentName) {
        const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
        const stateDir = join(projectDir, '.claude', 'hooks', 'state');
        const stateId = data.conversation_id || data.session_id;
        writeActiveAgent(stateDir, stateId, agentName);
        debugLog(`[BYPASS] Recorded active agent: ${agentName}`);
      }

      // Return empty output - no skills injected during RAPH
      return;
    }

    // Load skill rules
    const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
    const rulesPath = join(projectDir, '.claude', 'skills', 'skill-rules.json');
    const rules: SkillRulesConfig = JSON.parse(readFileSync(rulesPath, 'utf-8'));

    // State management - moved up for agent affinity check
    const stateDir = join(projectDir, '.claude', 'hooks', 'state');
    const stateId = data.conversation_id || data.session_id;
    const existingAcknowledged = readAcknowledgedSkills(stateDir, stateId);

    // Check for active agent affinity skills (first prompt after /role or /load)
    const activeAgent = readActiveAgent(stateDir, stateId);
    let agentAffinitySkills: string[] = [];
    if (activeAgent && rules.agentAffinity && rules.agentAffinity[activeAgent]) {
      // Get affinity skills not already acknowledged
      agentAffinitySkills = rules.agentAffinity[activeAgent].filter(
        (skill) => !existingAcknowledged.includes(skill) && skill in rules.skills
      );
      debugLog(`[AGENT AFFINITY] Active agent: ${activeAgent}`);
      debugLog(`[AGENT AFFINITY] Affinity skills to inject: ${JSON.stringify(agentAffinitySkills)}`);
    }

    // Analyze user intent with AI
    const analysis = await analyzeIntent(data.prompt, rules.skills);
    // Filter out non-existent skills (AI could return invalid names)
    const requiredDomainSkills = (analysis.required || []).filter((name) => name in rules.skills);
    const suggestedDomainSkills = (analysis.suggested || []).filter((name) => name in rules.skills);

    // DEBUG: Log AI analysis results
    debugLog('=== NEW PROMPT ===');
    debugLog(`Prompt: ${data.prompt}`);
    debugLog('AI Analysis Results:');
    debugLog(`  Required (critical): ${JSON.stringify(requiredDomainSkills)}`);
    debugLog(`  Suggested: ${JSON.stringify(suggestedDomainSkills)}`);
    debugLog(`  Scores: ${JSON.stringify(analysis.scores || {})}`);

    // Output banner
    let output = formatActivationBanner();

    // Handle skill injection - either agent affinity or keyword-matched skills
    const hasMatchedSkills = requiredDomainSkills.length > 0 || suggestedDomainSkills.length > 0;
    const hasAgentAffinitySkills = agentAffinitySkills.length > 0;

    if (hasMatchedSkills || hasAgentAffinitySkills) {
      // DEBUG: Log session state
      debugLog('Session State:');
      debugLog(`  Already acknowledged: ${JSON.stringify(existingAcknowledged)}`);
      debugLog(`  Active agent: ${activeAgent || 'none'}`);

      // Filter and promote skills
      const filtration = filterAndPromoteSkills(
        requiredDomainSkills,
        suggestedDomainSkills,
        existingAcknowledged,
        rules.skills
      );

      // DEBUG: Log filtration results
      debugLog('Filtration Results:');
      debugLog(`  To inject: ${JSON.stringify(filtration.toInject)}`);
      debugLog(`  Promoted: ${JSON.stringify(filtration.promoted)}`);
      debugLog(`  Remaining suggested: ${JSON.stringify(filtration.remainingSuggested)}`);

      // Find skill-to-skill affinity injections (bidirectional, free of slot cost)
      const skillAffinitySkills = findAffinityInjections(
        filtration.toInject,
        existingAcknowledged,
        rules.skills
      );

      // DEBUG: Log affinity results
      debugLog('Skill Affinity Injection:');
      debugLog(`  Skill affinity skills found: ${JSON.stringify(skillAffinitySkills)}`);

      // Resolve dependencies and inject skills
      // Combine: keyword-matched + skill-affinity + agent-affinity (all deduplicated)
      let injectedSkills: string[] = [];
      const allSkillsToInject = [
        ...new Set([...filtration.toInject, ...skillAffinitySkills, ...agentAffinitySkills])
      ];

      // DEBUG: Log combined skills before dependency resolution
      debugLog('Combined Skills (before dependency resolution):');
      debugLog(`  All skills to inject: ${JSON.stringify(allSkillsToInject)}`);

      if (allSkillsToInject.length > 0) {
        injectedSkills = resolveSkillDependencies(allSkillsToInject, rules.skills);

        // DEBUG: Log final injected skills
        debugLog('Final Injection:');
        debugLog(`  After dependency resolution: ${JSON.stringify(injectedSkills)}`);

        // Inject skills individually (one console.log per skill)
        for (const skillName of injectedSkills) {
          const skillPath = join(projectDir, '.claude', 'skills', skillName, 'SKILL.md');
          debugLog(`  Injecting skill: ${skillName} from ${skillPath}`);

          const injectionOutput = injectSkillContent([skillName], projectDir);
          if (injectionOutput) {
            console.log(injectionOutput);
            debugLog(`  ✓ Injected ${skillName} (${injectionOutput.length} chars)`);
          } else {
            debugLog(`  ✗ Failed to inject ${skillName} - no output generated`);
          }
        }
      }

      // Show just-injected skills in banner
      if (injectedSkills.length > 0) {
        output += formatJustInjectedSection(
          injectedSkills,
          filtration.toInject,
          skillAffinitySkills,
          filtration.promoted,
          agentAffinitySkills,
          activeAgent
        );
      }

      // Show already-loaded skills
      const alreadyAcknowledged = [...requiredDomainSkills, ...suggestedDomainSkills].filter(
        (skill) => existingAcknowledged.includes(skill)
      );
      if (alreadyAcknowledged.length > 0 && injectedSkills.length === 0) {
        output += formatAlreadyLoadedSection(alreadyAcknowledged);
      }

      // Show remaining recommended skills
      output += formatRecommendedSection(filtration.remainingSuggested, analysis.scores);

      output += formatClosingBanner();
      console.log(output);

      // Write session state
      if (injectedSkills.length > 0) {
        writeSessionState(
          stateDir,
          stateId,
          [...existingAcknowledged, ...injectedSkills],
          injectedSkills
        );
      }
    }
  } catch (err) {
    if (process.env.DEBUG_SKILL_HOOK) {
      console.error('⚠️ Skill activation hook error:', err);
    } else {
      console.error('⚠️ Skill activation hook error (enable DEBUG_SKILL_HOOK=1 for details)');
    }
    process.exit(0); // Don't fail the conversation on hook errors
  }
}

main();
