/**
 * Test Script: Validate AI Structured Response Generation
 *
 * Purpose: Validate that AI correctly generates structured responses
 * with {location}-{subject}-{shotType} pattern before UI implementation
 *
 * Usage:
 *   npm run test:ai-structured <image-path>
 *
 * Example:
 *   npm run test:ai-structured ./test-images/kitchen-oven.jpg
 */

// Load environment variables from .env file
import * as dotenv from 'dotenv';
dotenv.config();

import * as path from 'path';
import * as fs from 'fs/promises';
import { AIService } from '../services/aiService';
import type { AIAnalysisResult, Lexicon } from '../../src/types';

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

interface TestResult {
  imagePath: string;
  success: boolean;
  result?: AIAnalysisResult;
  error?: string;
  promptUsed?: string;
}

/**
 * Print formatted test result
 */
function printResult(testResult: TestResult): void {
  console.log('\n' + '='.repeat(80));
  console.log(`${colors.bright}Image:${colors.reset} ${testResult.imagePath}`);
  console.log('='.repeat(80));

  if (!testResult.success) {
    console.log(`${colors.red}✗ FAILED${colors.reset}`);
    console.log(`Error: ${testResult.error}`);
    return;
  }

  const result = testResult.result!;

  // Check if structured format was returned
  const isStructured = !!(result.location && result.subject && result.shotType);

  console.log(`${colors.green}✓ SUCCESS${colors.reset}`);
  console.log();

  if (isStructured) {
    console.log(`${colors.bright}Structured Components:${colors.reset}`);
    console.log(`  Location:  ${colors.cyan}${result.location}${colors.reset}`);
    console.log(`  Subject:   ${colors.cyan}${result.subject}${colors.reset}`);
    console.log(`  Shot Type: ${colors.cyan}${result.shotType}${colors.reset}`);
    console.log();
    console.log(`${colors.bright}Generated Name:${colors.reset} ${colors.green}${result.mainName}${colors.reset}`);
  } else {
    console.log(`${colors.yellow}⚠ WARNING: AI returned legacy format (no structured components)${colors.reset}`);
    console.log(`Main Name: ${result.mainName}`);
  }

  console.log();
  console.log(`${colors.bright}Metadata Tags:${colors.reset}`);
  result.keywords.forEach((tag: string) => console.log(`  • ${tag}`));

  console.log();
  console.log(`${colors.bright}Confidence:${colors.reset} ${result.confidence.toFixed(2)}`);

  // Validation checks
  console.log();
  console.log(`${colors.bright}Validation:${colors.reset}`);

  const validations = [
    {
      check: isStructured,
      pass: `${colors.green}✓${colors.reset} Structured format returned`,
      fail: `${colors.red}✗${colors.reset} Legacy format returned (missing location/subject/shotType)`,
    },
    {
      check: result.mainName.includes('-'),
      pass: `${colors.green}✓${colors.reset} Name uses kebab-case pattern`,
      fail: `${colors.red}✗${colors.reset} Name not in kebab-case`,
    },
    {
      check: result.mainName.split('-').length === 3,
      pass: `${colors.green}✓${colors.reset} Name has 3 components (location-subject-shotType)`,
      fail: `${colors.yellow}⚠${colors.reset} Name has ${result.mainName.split('-').length} components (expected 3)`,
    },
    {
      check: result.shotType ? ['WS', 'MID', 'CU', 'UNDER', 'FP', 'TRACK', 'ESTAB'].includes(result.shotType) : false,
      pass: `${colors.green}✓${colors.reset} Shot type from controlled vocabulary`,
      fail: `${colors.red}✗${colors.reset} Shot type not in vocabulary: ${result.shotType}`,
    },
  ];

  validations.forEach(v => {
    console.log(`  ${v.check ? v.pass : v.fail}`);
  });
}

/**
 * Test AI analysis with structured prompts
 */
async function testStructuredAnalysis(imagePath: string): Promise<TestResult> {
  try {
    // Validate image exists
    await fs.access(imagePath);

    // Load configuration directly (without electron-store)
    const configPath = path.join(process.cwd(), 'config', 'config.yaml');
    let lexicon: Lexicon;

    try {
      const yaml = await import('js-yaml');
      const configContent = await fs.readFile(configPath, 'utf-8');
      const config = yaml.load(configContent) as { lexicon: Lexicon };
      lexicon = config.lexicon;
    } catch (error) {
      // Use default structured lexicon if config doesn't exist
      lexicon = {
        commonLocations: [
          'kitchen', 'bathroom', 'bedroom', 'living-room',
          'garage', 'laundry', 'hallway', 'exterior',
        ],
        commonSubjects: [
          'oven', 'sink', 'tap', 'shower', 'toilet', 'window',
          'door', 'counter', 'cabinet', 'mirror',
        ],
        wordPreferences: {
          faucet: 'tap',
          basin: 'sink',
          stovetop: 'cooktop',
        },
        shotTypes: {
          static: ['WS', 'MID', 'CU', 'UNDER'],
          moving: ['FP', 'TRACK', 'ESTAB'],
        },
        aiInstructions: 'Generate structured name as {location}-{subject}-{shotType}',
      };
    }

    const isStructured = !!(lexicon.commonLocations || lexicon.commonSubjects || lexicon.shotTypes);
    const allShotTypes = lexicon.shotTypes
      ? [...lexicon.shotTypes.static, ...lexicon.shotTypes.moving]
      : ['WS', 'MID', 'CU', 'UNDER', 'FP', 'TRACK', 'ESTAB'];

    console.log(`${colors.bright}Configuration Loaded:${colors.reset}`);
    console.log(`  Config Path: ${configPath}`);
    console.log(`  Format: ${isStructured ? 'Structured' : 'Legacy'}`);

    if (isStructured) {
      console.log(`  Locations: ${lexicon.commonLocations?.length || 0} defined`);
      console.log(`  Subjects: ${lexicon.commonSubjects?.length || 0} defined`);
      console.log(`  Shot Types: ${allShotTypes.join(', ')}`);
    }

    // Get AI config from environment variables
    const provider = (process.env.AI_PROVIDER as 'openai' | 'anthropic' | 'openrouter') || 'openrouter';
    const model = process.env.AI_MODEL || 'anthropic/claude-3.5-sonnet';
    const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      throw new Error('No API key found. Set OPENROUTER_API_KEY, OPENAI_API_KEY, or ANTHROPIC_API_KEY environment variable.');
    }

    console.log();
    console.log(`${colors.bright}AI Configuration:${colors.reset}`);
    console.log(`  Provider: ${provider}`);
    console.log(`  Model: ${model}`);
    console.log(`  API Key: ${apiKey.substring(0, 8)}...${apiKey.slice(-4)}`);

    // Initialize AI service
    const aiService = new AIService(provider, model, apiKey);

    // Build and display prompt (async - loads from template file if available)
    const prompt = await aiService.buildPrompt(lexicon);
    console.log();
    console.log(`${colors.bright}Generated Prompt:${colors.reset}`);
    console.log(colors.blue + '─'.repeat(80) + colors.reset);
    console.log(prompt);
    console.log(colors.blue + '─'.repeat(80) + colors.reset);

    // Analyze image
    console.log();
    console.log(`${colors.bright}Analyzing image...${colors.reset}`);
    const result = await aiService.analyzeImage(imagePath, lexicon);

    return {
      imagePath,
      success: true,
      result,
      promptUsed: prompt,
    };
  } catch (error) {
    return {
      imagePath,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Main execution
 */
async function main() {
  console.log(`${colors.bright}${colors.cyan}`);
  console.log('╔═══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                  AI Structured Response Validation Test                      ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════════╝');
  console.log(colors.reset);

  const imagePath = process.argv[2];

  if (!imagePath) {
    console.error(`${colors.red}Error: No image path provided${colors.reset}`);
    console.log();
    console.log('Usage: npm run test:ai-structured <image-path>');
    console.log();
    console.log('Example:');
    console.log('  npm run test:ai-structured ./test-images/kitchen-oven.jpg');
    process.exit(1);
  }

  const testResult = await testStructuredAnalysis(imagePath);
  printResult(testResult);

  console.log();
  console.log('='.repeat(80));
  console.log();

  if (!testResult.success) {
    console.log(`${colors.red}Test failed. Fix errors and try again.${colors.reset}`);
    process.exit(1);
  }

  const isStructured = !!(testResult.result?.location && testResult.result?.subject && testResult.result?.shotType);

  if (!isStructured) {
    console.log(`${colors.yellow}⚠ WARNING: AI returned legacy format instead of structured format.${colors.reset}`);
    console.log();
    console.log('This could mean:');
    console.log('  1. The AI model ignored the structured format instructions');
    console.log('  2. The prompt needs tuning to emphasize structured response');
    console.log('  3. The model prefers different instruction phrasing');
    console.log();
    console.log('Next steps:');
    console.log('  • Try with a different image');
    console.log('  • Review the generated prompt above');
    console.log('  • Consider adjusting aiInstructions in config.yaml');
    process.exit(1);
  }

  console.log(`${colors.green}✓ Test passed! AI correctly generated structured response.${colors.reset}`);
  console.log();
  console.log('Ready to proceed with UI implementation.');
  process.exit(0);
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error(`${colors.red}Fatal error:${colors.reset}`, error);
    process.exit(1);
  });
}

export { testStructuredAnalysis };
