/**
 * Runtime validation for skill-rules.json structure
 *
 * Provides basic runtime validation to catch configuration errors early.
 * Full schema validation happens in pre-commit hooks via Python + jsonschema.
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

interface SkillConfig {
  type?: string;
  autoInject?: boolean;
  affinity?: unknown[];
  [key: string]: unknown;
}

interface SkillRules {
  version?: string;
  skills?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Validate skill-rules.json structure at runtime
 *
 * @param skillRules - The parsed skill rules configuration object
 * @returns Validation result with any errors found
 *
 * @example
 * const rules = JSON.parse(readFileSync('skill-rules.json', 'utf-8'));
 * const result = validateSkillRules(rules);
 * if (!result.valid) {
 *   console.error('Validation errors:', result.errors);
 * }
 */
export function validateSkillRules(skillRules: unknown): ValidationResult {
  const errors: string[] = [];

  // Type guard: Ensure skillRules is an object
  if (!skillRules || typeof skillRules !== 'object') {
    errors.push('skillRules must be an object');
    return { valid: false, errors };
  }

  const rules = skillRules as SkillRules;

  if (!rules.version) {
    errors.push('Missing required field: version');
  }

  if (!rules.skills || typeof rules.skills !== 'object') {
    errors.push('Missing or invalid field: skills (must be object)');
    return { valid: false, errors };
  }

  for (const [skillName, config] of Object.entries(rules.skills)) {
    // Type guard: Ensure config is an object
    if (!config || typeof config !== 'object') {
      errors.push(`${skillName}: skill config must be an object`);
      continue;
    }

    const skill = config as SkillConfig;

    // Validate required fields
    if (!skill.type || !['guardrail', 'domain'].includes(skill.type)) {
      errors.push(`${skillName}: Invalid or missing 'type' (must be 'guardrail' or 'domain')`);
    }

    if (typeof skill.autoInject !== 'boolean') {
      errors.push(`${skillName}: Missing or invalid 'autoInject' (must be boolean)`);
    }

    // Validate affinity if present
    if (skill.affinity) {
      if (!Array.isArray(skill.affinity)) {
        errors.push(`${skillName}: affinity must be array`);
      } else if (skill.affinity.length > 2) {
        errors.push(`${skillName}: affinity can have max 2 skills`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
