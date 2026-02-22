/**
 * Layer 1: Intent Router & Quick Allow Test
 *
 * 責務:
 * - LRU キャッシュ (1000 entries, 5s TTL)
 * - Intent パターンマッチング
 * - Fast Path 判定 (95% が 50-150ms)
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { IntentRouter } from '../../../src/unified-hooks/layer-1/intent-router';
import { HookEvent, HookIntent } from '../../../src/unified-hooks/types';

function createMockEvent(toolName: string, toolInput: Record<string, any> = {}): HookEvent {
  return {
    timestamp: Date.now(),
    toolName,
    toolInput,
    phase: 'PreToolUse',
    cwd: '/test/project',
    sessionId: 'test-session',
  };
}

describe('Layer 1: Intent Router', () => {
  let router: IntentRouter;

  beforeEach(() => {
    jest.clearAllMocks();
    router = new IntentRouter();
  });

  describe('Intent Detection', () => {
    test('should detect READ intent from Read tool', async () => {
      const event = createMockEvent('Read', { file_path: '/test/file.ts' });
      const result = await router.route(event);

      expect(result.intent).toBe(HookIntent.READ);
    });

    test('should detect WRITE intent from Write tool', async () => {
      const event = createMockEvent('Write', { file_path: '/test/file.ts', content: 'test' });
      const result = await router.route(event);

      expect(result.intent).toBe(HookIntent.WRITE);
    });

    test('should detect EDIT intent from Edit tool', async () => {
      const event = createMockEvent('Edit', { file_path: '/test/file.ts' });
      const result = await router.route(event);

      expect(result.intent).toBe(HookIntent.EDIT);
    });

    test('should detect BASH intent from Bash tool', async () => {
      const event = createMockEvent('Bash', { command: 'ls -la' });
      const result = await router.route(event);

      expect(result.intent).toBe(HookIntent.BASH);
    });

    test('should detect GLOB intent from Glob tool', async () => {
      const event = createMockEvent('Glob', { pattern: '**/*.ts' });
      const result = await router.route(event);

      expect(result.intent).toBe(HookIntent.GLOB);
    });

    test('should detect GREP intent from Grep tool', async () => {
      const event = createMockEvent('Grep', { pattern: 'test' });
      const result = await router.route(event);

      expect(result.intent).toBe(HookIntent.GREP);
    });

    test('should detect SKILL intent from Skill tool params', async () => {
      const event = createMockEvent('Skill', { skill_name: 'test-skill' });
      const result = await router.route(event);

      expect(result.intent).toBe(HookIntent.SKILL);
    });

    test('should detect UNKNOWN intent from unknown tool', async () => {
      const event = createMockEvent('UnknownTool', {});
      const result = await router.route(event);

      expect(result.intent).toBe(HookIntent.UNKNOWN);
    });
  });

  describe('Quick Allow (Fast Path)', () => {
    test('should allow Read operations immediately (Fast Path)', async () => {
      const event = createMockEvent('Read', { file_path: '/test/file.ts' });
      const result = await router.route(event);

      expect(result.allow).toBe(true);
      expect(result.skipLayers).toEqual([2, 3]);
      expect(result.fastPath).toBe(true);
      expect(result.reason).toContain('Fast Path');
    });

    test('should allow Glob operations (Fast Path)', async () => {
      const event = createMockEvent('Glob', { pattern: '**/*.ts' });
      const result = await router.route(event);

      expect(result.allow).toBe(true);
      expect(result.skipLayers).toEqual([2, 3]);
      expect(result.fastPath).toBe(true);
    });

    test('should allow Grep operations (Fast Path)', async () => {
      const event = createMockEvent('Grep', { pattern: 'test' });
      const result = await router.route(event);

      expect(result.allow).toBe(true);
      expect(result.skipLayers).toEqual([2, 3]);
      expect(result.fastPath).toBe(true);
    });

    test('should allow read-only bash commands (Fast Path)', async () => {
      const event = createMockEvent('Bash', { command: 'ls -la' });
      const result = await router.route(event);

      expect(result.allow).toBe(true);
      expect(result.skipLayers).toEqual([2, 3]);
      expect(result.fastPath).toBe(true);
    });

    test('should allow cat command (Fast Path)', async () => {
      const event = createMockEvent('Bash', { command: 'cat file.txt' });
      const result = await router.route(event);

      expect(result.allow).toBe(true);
      expect(result.skipLayers).toEqual([2, 3]);
    });

    test('should allow safe file Write (skip Layer 3 only)', async () => {
      const event = createMockEvent('Write', { file_path: '/test/file.test.ts', content: 'test' });
      const result = await router.route(event);

      expect(result.allow).toBe(true);
      expect(result.skipLayers).toEqual([3]);
      expect(result.reason).toContain('Safe file pattern');
    });

    test('should allow .md file Write (skip Layer 3 only)', async () => {
      const event = createMockEvent('Write', { file_path: '/test/README.md', content: 'test' });
      const result = await router.route(event);

      expect(result.allow).toBe(true);
      expect(result.skipLayers).toEqual([3]);
    });

    test('should require Layer 2 validation for Skill', async () => {
      const event = createMockEvent('Skill', { skill_name: 'test' });
      const result = await router.route(event);

      expect(result.allow).toBe(false);
      expect(result.skipLayers).toEqual([3]);
      expect(result.reason).toContain('policy validation');
    });

    test('should require full validation for unsafe Write', async () => {
      const event = createMockEvent('Write', { file_path: '/test/important.ts', content: 'test' });
      const result = await router.route(event);

      expect(result.allow).toBe(false);
      expect(result.skipLayers).toEqual([]);
    });
  });

  describe('LRU Cache', () => {
    test('should cache intent detection results', async () => {
      const event = createMockEvent('Read', { file_path: '/test/file.ts' });

      const result1 = await router.route(event);
      const result2 = await router.route(event);

      expect(result1.cacheHit).toBe(false);
      expect(result2.cacheHit).toBe(true);
    });

    test('should increment cache hit counter', async () => {
      const event = createMockEvent('Read', { file_path: '/test/file.ts' });

      await router.route(event);
      await router.route(event);

      const stats = router.getStats();
      expect(stats.cacheHits).toBe(1);
      expect(stats.cacheMisses).toBe(1);
      expect(stats.hitRate).toBe(0.5);
    });

    test('should clear cache', async () => {
      const event = createMockEvent('Read', { file_path: '/test/file.ts' });

      await router.route(event);
      router.clearCache();

      const stats = router.getStats();
      expect(stats.cacheSize).toBe(0);
      expect(stats.cacheHits).toBe(0);
      expect(stats.cacheMisses).toBe(0);
    });

    test('should generate different cache keys for different files', async () => {
      const event1 = createMockEvent('Read', { file_path: '/test/file1.ts' });
      const event2 = createMockEvent('Read', { file_path: '/test/file2.ts' });

      await router.route(event1);
      const result2 = await router.route(event2);

      expect(result2.cacheHit).toBe(false);
    });

    test('should generate cache keys for Bash commands', async () => {
      const event1 = createMockEvent('Bash', { command: 'ls -la' });
      const event2 = createMockEvent('Bash', { command: 'ls -la' });

      await router.route(event1);
      const result2 = await router.route(event2);

      expect(result2.cacheHit).toBe(true);
    });
  });

  describe('Safe File Detection', () => {
    test('should detect .test.ts as safe', async () => {
      const event = createMockEvent('Write', { file_path: '/test/app.test.ts' });
      const result = await router.route(event);

      expect(result.skipLayers).toContain(3);
    });

    test('should detect .spec.js as safe', async () => {
      const event = createMockEvent('Write', { file_path: '/test/app.spec.js' });
      const result = await router.route(event);

      expect(result.skipLayers).toContain(3);
    });

    test('should detect .json as safe', async () => {
      const event = createMockEvent('Write', { file_path: '/test/config.json' });
      const result = await router.route(event);

      expect(result.skipLayers).toContain(3);
    });

    test('should detect README as safe', async () => {
      const event = createMockEvent('Write', { file_path: '/test/README.md' });
      const result = await router.route(event);

      expect(result.skipLayers).toContain(3);
    });

    test('should detect CHANGELOG as safe', async () => {
      const event = createMockEvent('Write', { file_path: '/test/CHANGELOG.md' });
      const result = await router.route(event);

      expect(result.skipLayers).toContain(3);
    });
  });

  describe('Read-Only Command Detection', () => {
    test('should detect ls as read-only', async () => {
      const event = createMockEvent('Bash', { command: 'ls -la /test' });
      const result = await router.route(event);

      expect(result.allow).toBe(true);
      expect(result.skipLayers).toEqual([2, 3]);
    });

    test('should detect grep as read-only', async () => {
      const event = createMockEvent('Bash', { command: 'grep pattern file.txt' });
      const result = await router.route(event);

      expect(result.allow).toBe(true);
      expect(result.skipLayers).toEqual([2, 3]);
    });

    test('should detect find as read-only', async () => {
      const event = createMockEvent('Bash', { command: 'find . -name "*.ts"' });
      const result = await router.route(event);

      expect(result.allow).toBe(true);
      expect(result.skipLayers).toEqual([2, 3]);
    });

    test('should not allow rm as read-only', async () => {
      const event = createMockEvent('Bash', { command: 'rm file.txt' });
      const result = await router.route(event);

      expect(result.allow).toBe(false);
      expect(result.skipLayers).toEqual([]);
    });

    test('should not allow mv as read-only', async () => {
      const event = createMockEvent('Bash', { command: 'mv old.txt new.txt' });
      const result = await router.route(event);

      expect(result.allow).toBe(false);
      expect(result.skipLayers).toEqual([]);
    });
  });

  describe('Statistics', () => {
    test('should return cache statistics', async () => {
      const event = createMockEvent('Read', { file_path: '/test/file.ts' });

      await router.route(event);
      await router.route(event);

      const stats = router.getStats();

      expect(stats.cacheSize).toBeGreaterThan(0);
      expect(stats.cacheHits).toBe(1);
      expect(stats.cacheMisses).toBe(1);
      expect(stats.hitRate).toBe(0.5);
    });

    test('should calculate hit rate correctly', async () => {
      const event = createMockEvent('Read', { file_path: '/test/file.ts' });

      await router.route(event);
      await router.route(event);
      await router.route(event);

      const hitRate = router.getCacheHitRate();
      expect(hitRate).toBeCloseTo(2 / 3);
    });
  });
});
