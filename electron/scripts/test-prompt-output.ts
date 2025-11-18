/**
 * Test script to verify prompt output and token count
 * Run with: npx tsx test-prompt-output.ts
 */

import { PromptLoader } from '../utils/promptLoader';
import type { Lexicon } from '../../src/types';

// Mock lexicon with actual config.yaml values
const mockLexicon: Lexicon = {
  pattern: '{location}-{subject}-{shotType}',
  commonLocations: [
    'kitchen', 'bathroom', 'bedroom', 'living-room', 'dining-room',
    'hallway', 'laundry', 'garage', 'office', 'utility-room', 'pantry', 'exterior'
  ],
  commonSubjects: [
    'bin', 'oven', 'hob', 'microwave', 'refrigerator', 'dishwasher', 'wine-cooler',
    'sink', 'tap', 'counter', 'cabinet', 'drawer', 'plug-socket', 'media-plate',
    'spur-switches', 'toilet', 'shower', 'bath', 'mirror', 'controls', 'window',
    'door', 'light', 'switch', 'serial', 'label'
  ],
  commonActions: [
    'cleaning', 'moving', 'turning-on', 'opening', 'demo',
    'installing', 'replacing', 'inspecting', 'removing', 'adjusting'
  ],
  wordPreferences: {
    'trash': 'bin',
    'cooker': 'oven',
    'stove': 'hob',
    'electrical-socket': 'plug-socket',
    'multimedia-wall-plate': 'media-plate',
    'appliance switches': 'spur-switches',
    'wine fridge': 'wine-cooler',
    'faucet': 'tap'
  },
  shotTypes: {
    static: ['WS', 'MID', 'CU', 'UNDER'],
    moving: ['FP', 'TRACK', 'ESTAB']
  },
  aiInstructions: `Generate structured name as {location}-{subject}-{shotType}

IMPORTANT RULES:
- Use British English always
- Add manufacturer/brand to metadata if visible
- Location should be room type
- Subject should be main object
- Shot type MUST be from controlled vocabulary

NAMING CONVENTIONS:
- If appliance controls: "[type]-controls"
- If serial label: "[type]-serial"
- Keep subject concise, 1-3 words, kebab-case

METADATA RULES:
- Maximum 4 tags
- Include manufacturer if visible
- Use British English terms`,
  goodExamples: [
    'kitchen-oven-CU',
    'bath-shower-MID',
    'kitchen-dishwasher-cleaning-MID',
    'hall-door-opening-WS',
    'utility-spur-switches-CU'
  ],
  badExamples: [
    { wrong: 'Kitchen-Oven-CU', reason: 'mixed case' },
    { wrong: 'kitchen_oven_CU', reason: 'underscores' },
    { wrong: 'kitchen-fridge freezer-CU', reason: 'missing hyphen' }
  ]
};

async function testPromptGeneration() {
  console.log('='.repeat(80));
  console.log('PROMPT OUTPUT TEST');
  console.log('='.repeat(80));

  const prompt = await PromptLoader.loadPrompt('structured-analysis', mockLexicon);

  if (!prompt) {
    console.log('\n❌ Template file not found, using fallback (expected in test environment)');
    return;
  }

  console.log('\n📄 GENERATED PROMPT:\n');
  console.log(prompt);

  console.log('\n' + '='.repeat(80));
  console.log('METRICS:');
  console.log('='.repeat(80));

  const charCount = prompt.length;
  const lineCount = prompt.split('\n').length;

  // Rough token estimation (1 token ≈ 4 characters for English text)
  const estimatedTokens = Math.ceil(charCount / 4);

  console.log(`Characters: ${charCount}`);
  console.log(`Lines: ${lineCount}`);
  console.log(`Estimated tokens: ~${estimatedTokens}`);
  console.log(`Target: ~350 tokens`);

  if (estimatedTokens <= 350) {
    console.log(`\n✅ WITHIN TARGET (saved ~${400 - estimatedTokens} tokens from previous ~400)`);
  } else {
    console.log(`\n⚠️  EXCEEDS TARGET by ~${estimatedTokens - 350} tokens`);
  }

  console.log('\n' + '='.repeat(80));
}

testPromptGeneration().catch(console.error);
