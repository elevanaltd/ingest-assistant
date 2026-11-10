/**
 * Zod behaviour pins (pre zod v4 migration, GHSA-mrhx-c7xc-m3w5)
 *
 * Characterisation tests for the security-critical IPC validation layer.
 * They assert library-version-independent behaviour only (accept/reject,
 * issue paths, custom messages, key stripping, no coercion, ZodError identity)
 * so they must pass identically on zod 3 and zod 4.
 *
 * Note: ipcSchemas performs length/shape validation only. Path-traversal and
 * metacharacter defences live in securityValidator, not in these schemas; the
 * "accepts" pins below record that the schema layer does not reject them.
 */
import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  AIAnalyzeFileSchema,
  AIBatchProcessSchema,
  BatchStartSchema,
  ConfigSaveSchema,
  FileListRangeSchema,
  FileRenameSchema,
  FileStructuredUpdateSchema,
  FileUpdateMetadataSchema,
  LexiconSaveSchema,
  StructuredMetadataSchema,
} from './ipcSchemas';
import { AIAnalysisResultSchema, AIAnalysisResultV1Schema } from './aiResultSchemas';

const issuePaths = (schema: z.ZodType, input: unknown): string[] => {
  const r = schema.safeParse(input);
  if (r.success) throw new Error('expected rejection');
  return r.error.issues.map((i) => i.path.join('.'));
};

describe('zod behaviour pins: ipcSchemas', () => {
  describe('error identity and shape', () => {
    it('throws an instance of z.ZodError exposing issues[] with paths', () => {
      let caught: unknown;
      try {
        FileRenameSchema.parse({ fileId: '', shotName: 'x', currentPath: '/a' });
      } catch (e) {
        caught = e;
      }
      expect(caught).toBeInstanceOf(z.ZodError);
      const err = caught as z.ZodError;
      expect(Array.isArray(err.issues)).toBe(true);
      expect(err.issues[0].path).toEqual(['fileId']);
    });

    it('safeParse failure reports every failing field path', () => {
      expect(issuePaths(FileRenameSchema, { fileId: '', shotName: '', currentPath: '' }).sort()).toEqual(
        ['currentPath', 'fileId', 'shotName']
      );
    });

    it('reports nested paths for structured metadata', () => {
      expect(
        issuePaths(FileStructuredUpdateSchema, {
          fileId: 'a',
          structured: { location: 'x'.repeat(201), subject: 's', shotType: 'WS' },
        })
      ).toEqual(['structured.location']);
    });
  });

  describe('type strictness (no coercion)', () => {
    it('rejects numeric strings and floats for FileListRangeSchema', () => {
      expect(FileListRangeSchema.safeParse({ startIndex: '0', pageSize: 10 }).success).toBe(false);
      expect(FileListRangeSchema.safeParse({ startIndex: 0, pageSize: '10' }).success).toBe(false);
      expect(FileListRangeSchema.safeParse({ startIndex: 0.5, pageSize: 10 }).success).toBe(false);
      expect(FileListRangeSchema.safeParse({ startIndex: 0, pageSize: 10.5 }).success).toBe(false);
    });

    it('rejects NaN, Infinity and negatives', () => {
      expect(FileListRangeSchema.safeParse({ startIndex: NaN, pageSize: 10 }).success).toBe(false);
      expect(FileListRangeSchema.safeParse({ startIndex: Infinity, pageSize: 10 }).success).toBe(false);
      expect(FileListRangeSchema.safeParse({ startIndex: -1, pageSize: 10 }).success).toBe(false);
    });

    it('enforces inclusive numeric bounds', () => {
      expect(FileListRangeSchema.safeParse({ startIndex: 0, pageSize: 1 }).success).toBe(true);
      expect(FileListRangeSchema.safeParse({ startIndex: 1000000, pageSize: 100 }).success).toBe(true);
      expect(FileListRangeSchema.safeParse({ startIndex: 1000001, pageSize: 100 }).success).toBe(false);
      expect(FileListRangeSchema.safeParse({ startIndex: 0, pageSize: 0 }).success).toBe(false);
      expect(FileListRangeSchema.safeParse({ startIndex: 0, pageSize: 101 }).success).toBe(false);
    });

    it('rejects null/undefined/non-object payloads', () => {
      for (const bad of [null, undefined, 'str', 42, [], true]) {
        expect(FileRenameSchema.safeParse(bad).success).toBe(false);
        expect(FileListRangeSchema.safeParse(bad).success).toBe(false);
      }
    });

    it('rejects null for optional action (only undefined is optional)', () => {
      expect(
        StructuredMetadataSchema.safeParse({ location: 'l', subject: 's', action: null, shotType: 'CU' }).success
      ).toBe(false);
    });

    it('allows StructuredMetadataSchema itself to be undefined (optional wrapper)', () => {
      expect(StructuredMetadataSchema.safeParse(undefined).success).toBe(true);
    });
  });

  describe('string length boundaries', () => {
    it('FileRename: fileId <=50, shotName <=500, min 1', () => {
      const base = { fileId: 'a', shotName: 'b', currentPath: '/c' };
      expect(FileRenameSchema.safeParse({ ...base, fileId: 'x'.repeat(50) }).success).toBe(true);
      expect(FileRenameSchema.safeParse({ ...base, fileId: 'x'.repeat(51) }).success).toBe(false);
      expect(FileRenameSchema.safeParse({ ...base, shotName: 'x'.repeat(500) }).success).toBe(true);
      expect(FileRenameSchema.safeParse({ ...base, shotName: 'x'.repeat(501) }).success).toBe(false);
      expect(FileRenameSchema.safeParse({ ...base, currentPath: '' }).success).toBe(false);
    });

    it('ConfigSave: provider enum and key/model limits', () => {
      const base = { provider: 'openai', apiKey: 'k', model: 'm' };
      expect(ConfigSaveSchema.safeParse(base).success).toBe(true);
      expect(ConfigSaveSchema.safeParse({ ...base, provider: 'anthropic' }).success).toBe(true);
      expect(ConfigSaveSchema.safeParse({ ...base, provider: 'openrouter' }).success).toBe(false);
      expect(ConfigSaveSchema.safeParse({ ...base, apiKey: '' }).success).toBe(false);
      expect(ConfigSaveSchema.safeParse({ ...base, apiKey: 'k'.repeat(200) }).success).toBe(true);
      expect(ConfigSaveSchema.safeParse({ ...base, apiKey: 'k'.repeat(201) }).success).toBe(false);
      expect(ConfigSaveSchema.safeParse({ ...base, model: 'm'.repeat(101) }).success).toBe(false);
    });

    it('shotType enum is closed and case-sensitive', () => {
      const ok = (shotType: unknown) =>
        StructuredMetadataSchema.safeParse({ location: 'l', subject: 's', shotType }).success;
      for (const t of ['WS', 'MID', 'CU', 'UNDER', 'FP', 'TRACK', 'ESTAB']) expect(ok(t)).toBe(true);
      for (const t of ['ws', 'Cu', '', 'OTHER', 1, null, undefined]) expect(ok(t)).toBe(false);
    });
  });

  describe('array limits', () => {
    it('AIBatchProcess / BatchStart: 1..100 string ids', () => {
      for (const schema of [AIBatchProcessSchema, BatchStartSchema]) {
        expect(schema.safeParse({ fileIds: ['a'] }).success).toBe(true);
        expect(schema.safeParse({ fileIds: Array(100).fill('a') }).success).toBe(true);
        expect(schema.safeParse({ fileIds: [] }).success).toBe(false);
        expect(schema.safeParse({ fileIds: Array(101).fill('a') }).success).toBe(false);
        expect(schema.safeParse({ fileIds: [1, 2] }).success).toBe(false);
        expect(schema.safeParse({ fileIds: 'a' }).success).toBe(false);
      }
    });

    it('FileUpdateMetadata: keywords max 100, strings only, required', () => {
      expect(FileUpdateMetadataSchema.safeParse({ fileId: 'a', keywords: [] }).success).toBe(true);
      expect(FileUpdateMetadataSchema.safeParse({ fileId: 'a', keywords: Array(100).fill('k') }).success).toBe(true);
      expect(FileUpdateMetadataSchema.safeParse({ fileId: 'a', keywords: Array(101).fill('k') }).success).toBe(false);
      expect(FileUpdateMetadataSchema.safeParse({ fileId: 'a', keywords: [1] }).success).toBe(false);
      expect(FileUpdateMetadataSchema.safeParse({ fileId: 'a' }).success).toBe(false);
    });
  });

  describe('unknown keys are stripped, not rejected', () => {
    it('strips extra properties from parsed output', () => {
      const out = FileRenameSchema.parse({
        fileId: 'a',
        shotName: 'b',
        currentPath: '/c',
        evil: 'x',
        isAdmin: true,
      }) as Record<string, unknown>;
      expect(out).toEqual({ fileId: 'a', shotName: 'b', currentPath: '/c' });
      expect('evil' in out).toBe(false);
    });

    it('strips extra properties from nested structured metadata', () => {
      const out = FileStructuredUpdateSchema.parse({
        fileId: 'a',
        structured: { location: 'l', subject: 's', shotType: 'WS', extra: 1 },
        top: 1,
      });
      expect(out).toEqual({ fileId: 'a', structured: { location: 'l', subject: 's', shotType: 'WS' } });
    });

    it('does not pollute Object.prototype via __proto__ keys', () => {
      const payload = JSON.parse(
        '{"fileId":"a","shotName":"b","currentPath":"/c","__proto__":{"polluted":true}}'
      );
      const out = FileRenameSchema.parse(payload) as Record<string, unknown>;
      expect(({} as Record<string, unknown>).polluted).toBeUndefined();
      expect(out.polluted).toBeUndefined();
      expect(Object.keys(out).sort()).toEqual(['currentPath', 'fileId', 'shotName']);
    });
  });

  describe('schema layer does not reject path/metacharacter content (defence is in securityValidator)', () => {
    it.each([
      '../../etc/passwd',
      '/tmp/a;rm -rf /',
      '$(whoami)',
      '--flag',
      'a\0b',
      '..\\..\\windows\\system32',
    ])('accepts %j as currentPath / filePath string', (s) => {
      expect(FileRenameSchema.safeParse({ fileId: 'a', shotName: 'b', currentPath: s }).success).toBe(true);
      expect(AIAnalyzeFileSchema.safeParse({ filePath: s }).success).toBe(true);
    });

    it('still rejects empty filePath', () => {
      expect(AIAnalyzeFileSchema.safeParse({ filePath: '' }).success).toBe(false);
    });
  });

  describe('LexiconSaveSchema (record + refine)', () => {
    const lex = (n: number) => Object.fromEntries(Array.from({ length: n }, (_, i) => [`k${i}`, i]));

    it('accepts 0..1000 entries with arbitrary values', () => {
      expect(LexiconSaveSchema.safeParse({ lexicon: {} }).success).toBe(true);
      expect(LexiconSaveSchema.safeParse({ lexicon: lex(1000) }).success).toBe(true);
      expect(LexiconSaveSchema.safeParse({ lexicon: { a: null, b: [1], c: { d: 1 }, e: undefined } }).success).toBe(true);
    });

    it('rejects 1001 entries with the custom message at path [lexicon]', () => {
      const r = LexiconSaveSchema.safeParse({ lexicon: lex(1001) });
      expect(r.success).toBe(false);
      if (!r.success) {
        expect(r.error.issues).toHaveLength(1);
        expect(r.error.issues[0].message).toBe('Lexicon cannot exceed 1000 entries');
        expect(r.error.issues[0].path).toEqual(['lexicon']);
      }
    });

    it('rejects non-object lexicon values', () => {
      for (const bad of [null, 'x', 1, [], undefined]) {
        expect(LexiconSaveSchema.safeParse({ lexicon: bad }).success).toBe(false);
      }
    });

    it('does not let a JSON __proto__ key pollute the prototype', () => {
      const payload = JSON.parse('{"lexicon":{"__proto__":{"polluted":true},"a":1}}');
      LexiconSaveSchema.safeParse(payload);
      expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    });
  });
});

describe('zod behaviour pins: aiResultSchemas', () => {
  const v1 = { shotName: 'n', keywords: [], confidence: 0.5 };

  it('defaults missing version to "1" and keeps it in the output', () => {
    const r = AIAnalysisResultV1Schema.parse(v1);
    expect(r.version).toBe('1');
    expect(AIAnalysisResultSchema.parse(v1)).toMatchObject({ version: '1', shotName: 'n' });
  });

  it('rejects unknown and non-string discriminator values', () => {
    for (const version of ['0', '3', 1, 2, null]) {
      expect(AIAnalysisResultSchema.safeParse({ ...v1, version }).success).toBe(false);
    }
  });

  it('v2 requires version and strips unknown keys; accepts empty-string shotType', () => {
    const v2 = { version: '2', shotName: 'n', keywords: ['a'], confidence: 1, shotType: '', junk: 1 };
    const out = AIAnalysisResultSchema.parse(v2) as Record<string, unknown>;
    expect(out.shotType).toBe('');
    expect('junk' in out).toBe(false);
    expect(AIAnalysisResultSchema.safeParse({ ...v2, shotType: 'BAD' }).success).toBe(false);
  });

  it('confidence bounds are inclusive 0..1', () => {
    expect(AIAnalysisResultSchema.safeParse({ ...v1, confidence: 0 }).success).toBe(true);
    expect(AIAnalysisResultSchema.safeParse({ ...v1, confidence: 1 }).success).toBe(true);
    expect(AIAnalysisResultSchema.safeParse({ ...v1, confidence: -0.01 }).success).toBe(false);
    expect(AIAnalysisResultSchema.safeParse({ ...v1, confidence: 1.01 }).success).toBe(false);
    expect(AIAnalysisResultSchema.safeParse({ ...v1, confidence: '0.5' }).success).toBe(false);
  });

  it('failure exposes ZodError with issues carrying path', () => {
    const r = AIAnalysisResultSchema.safeParse({ ...v1, keywords: 'x' });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error).toBeInstanceOf(z.ZodError);
      expect(r.error.issues.some((i) => i.path[0] === 'keywords')).toBe(true);
    }
  });
});
