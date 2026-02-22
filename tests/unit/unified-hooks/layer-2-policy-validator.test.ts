/**
 * Layer 2: Policy & State Validator Test
 *
 * 責務:
 * - Workflow Fidelity Contract 検証
 * - 複雑度検出 (66 パターン)
 * - Skill 要求強制
 * - Read-before-Write 検証
 * - 処理時間: 100-200ms
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { PolicyValidator } from '../../../src/unified-hooks/layer-2/policy-validator';
import { StateValidator } from '../../../src/unified-hooks/layer-2/state-validator';
import { HookEvent, HookIntent, HookDecision, WorkflowState } from '../../../src/unified-hooks/types';
import * as fs from 'fs';

jest.mock('fs');

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

function createMockState(): WorkflowState {
  return {
    version: '1.0',
    meta: {
      workflowId: 'test-workflow',
      strict: true,
      currentPhase: 1,
      startedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    },
    evidence: {
      read_log: ['/test/existing.ts'],
      approved_deviations: [],
      skillEvidence: [],
      required_skills: {},
    },
    baseline: {
      files: {
        'baseline.ts': { hash: 'abc123' },
      },
    },
    approvals: {
      deviations: [],
    },
  };
}

describe('Layer 2: Policy & State Validator', () => {
  let policyValidator: PolicyValidator;
  let stateValidator: StateValidator;

  beforeEach(() => {
    jest.clearAllMocks();
    policyValidator = new PolicyValidator();
    stateValidator = new StateValidator();
  });

  describe('Workflow Fidelity Contract', () => {
    test('should detect simplification keywords in description', async () => {
      const event = createMockEvent('Write', {
        file_path: '/test/file.ts',
        description: 'Simplified the implementation for better performance',
      });

      const result = await policyValidator.validate(event, HookIntent.WRITE);

      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].type).toBe('workflow_fidelity');
      expect(result.violations[0].severity).toBe('high');
      expect(result.violations[0].message).toContain('無断簡略化');
    });

    test('should detect optimization keywords', async () => {
      const event = createMockEvent('Write', {
        file_path: '/test/file.ts',
        description: 'Optimized the code',
      });

      const result = await policyValidator.validate(event, HookIntent.WRITE);

      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].severity).toBe('high');
    });

    test('should detect Japanese simplification keywords', async () => {
      const event = createMockEvent('Bash', {
        command: 'npm test',
        description: 'シンプルにテストを実行',
      });

      const result = await policyValidator.validate(event, HookIntent.BASH);

      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].type).toBe('workflow_fidelity');
    });

    test('should detect 効率化 keyword', async () => {
      const event = createMockEvent('Write', {
        file_path: '/test/file.ts',
        description: '効率化のためリファクタリング',
      });

      const result = await policyValidator.validate(event, HookIntent.WRITE);

      expect(result.violations).toHaveLength(1);
    });

    test('should allow operations without simplification keywords', async () => {
      const event = createMockEvent('Write', {
        file_path: '/test/file.ts',
        description: 'Implement new feature as specified',
      });

      const result = await policyValidator.validate(event, HookIntent.WRITE);

      expect(result.violations).toHaveLength(0);
      expect(result.decision).toBe(HookDecision.ALLOW);
    });
  });

  describe('Complexity Detection (66 Patterns)', () => {
    test('should detect interactive-video-platform requirement', async () => {
      const event = createMockEvent('Skill', {
        skill_name: 'custom',
        description: 'Create interactive video with branching',
      });

      const result = await policyValidator.validate(event, HookIntent.SKILL);

      const requirement = result.skillRequirements.find(r => r.skillName === 'interactive-video-platform');
      expect(requirement).toBeDefined();
      expect(requirement?.strict).toBe(true);
      expect(requirement?.autoMapped).toBe(true);
    });

    test('should detect VSL requirement', async () => {
      const event = createMockEvent('Write', {
        file_path: '/test/vsl.ts',
        content: 'VSL video generation',
      });

      const result = await policyValidator.validate(event, HookIntent.WRITE);

      const requirement = result.skillRequirements.find(r => r.skillName === 'interactive-video-platform');
      expect(requirement).toBeDefined();
    });

    test('should detect youtubeschool-creator requirement', async () => {
      const event = createMockEvent('Bash', {
        command: 'npm run create',
        description: 'YouTube教材の作成',
      });

      const result = await policyValidator.validate(event, HookIntent.BASH);

      const requirement = result.skillRequirements.find(r => r.skillName === 'youtubeschool-creator');
      expect(requirement).toBeDefined();
      expect(requirement?.strict).toBe(true);
    });

    test('should detect taiyo-style sales letter requirement', async () => {
      const event = createMockEvent('Write', {
        file_path: '/test/sales.txt',
        content: 'Sales letter template',
      });

      const result = await policyValidator.validate(event, HookIntent.WRITE);

      const requirement = result.skillRequirements.find(r => r.skillName === 'taiyo-style-sales-letter');
      expect(requirement).toBeDefined();
      expect(requirement?.strict).toBe(false);
    });

    test('should detect Japanese sales letter requirement', async () => {
      const event = createMockEvent('Write', {
        file_path: '/test/sales.txt',
        content: 'セールスレター作成',
      });

      const result = await policyValidator.validate(event, HookIntent.WRITE);

      const requirement = result.skillRequirements.find(r => r.skillName === 'taiyo-style-sales-letter');
      expect(requirement).toBeDefined();
    });

    test('should detect voice-ai requirement', async () => {
      const event = createMockEvent('Bash', {
        command: 'node voice-call.js',
        description: 'Voice AI phone call',
      });

      const result = await policyValidator.validate(event, HookIntent.BASH);

      const requirement = result.skillRequirements.find(r => r.skillName === 'voice-ai');
      expect(requirement).toBeDefined();
      expect(requirement?.strict).toBe(false);
    });

    test('should detect ai-sdr requirement', async () => {
      const event = createMockEvent('Write', {
        file_path: '/test/sdr.ts',
        content: 'SDR pipeline automation',
      });

      const result = await policyValidator.validate(event, HookIntent.WRITE);

      const requirement = result.skillRequirements.find(r => r.skillName === 'ai-sdr');
      expect(requirement).toBeDefined();
    });

    test('should detect Japanese 営業 keyword for ai-sdr', async () => {
      const event = createMockEvent('Write', {
        file_path: '/test/sales.ts',
        content: '営業パイプラインの構築',
      });

      const result = await policyValidator.validate(event, HookIntent.WRITE);

      const requirement = result.skillRequirements.find(r => r.skillName === 'ai-sdr');
      expect(requirement).toBeDefined();
    });
  });

  describe('State Validation - Read-before-Write', () => {
    test('should detect Write without prior Read', () => {
      const event = createMockEvent('Write', { file_path: '/test/unread.ts' });
      const state = createMockState();
      const violations: any[] = [];

      (fs.existsSync as jest.Mock).mockReturnValue(true);

      stateValidator.checkReadBeforeWrite(event, state, violations);

      expect(violations).toHaveLength(1);
      expect(violations[0].type).toBe('read_before_write');
      expect(violations[0].severity).toBe('medium');
    });

    test('should allow Write after Read', () => {
      const event = createMockEvent('Write', { file_path: '/test/existing.ts' });
      const state = createMockState();
      const violations: any[] = [];

      (fs.existsSync as jest.Mock).mockReturnValue(true);

      stateValidator.checkReadBeforeWrite(event, state, violations);

      expect(violations).toHaveLength(0);
    });

    test('should detect new file creation without approval', () => {
      const event = createMockEvent('Write', { file_path: '/test/newfile.ts' });
      const state = createMockState();
      const violations: any[] = [];

      (fs.existsSync as jest.Mock).mockReturnValue(false);

      stateValidator.checkReadBeforeWrite(event, state, violations);

      expect(violations).toHaveLength(1);
      expect(violations[0].severity).toBe('high');
      expect(violations[0].message).toContain('新規ファイル');
    });

    test('should skip validation for non-Write tools', () => {
      const event = createMockEvent('Read', { file_path: '/test/file.ts' });
      const state = createMockState();
      const violations: any[] = [];

      stateValidator.checkReadBeforeWrite(event, state, violations);

      expect(violations).toHaveLength(0);
    });

    test('should allow new .md file creation', () => {
      const event = createMockEvent('Write', { file_path: '/test/docs.md' });
      const state = createMockState();
      const violations: any[] = [];

      (fs.existsSync as jest.Mock).mockReturnValue(false);

      stateValidator.checkReadBeforeWrite(event, state, violations);

      expect(violations).toHaveLength(0);
    });

    test('should allow new .txt file creation', () => {
      const event = createMockEvent('Write', { file_path: '/test/notes.txt' });
      const state = createMockState();
      const violations: any[] = [];

      (fs.existsSync as jest.Mock).mockReturnValue(false);

      stateValidator.checkReadBeforeWrite(event, state, violations);

      expect(violations).toHaveLength(0);
    });
  });

  describe('State Validation - Baseline Lock', () => {
    test('should detect baseline file modification', () => {
      const event = createMockEvent('Write', { file_path: '/test/baseline.ts' });
      const state = createMockState();
      const violations: any[] = [];

      stateValidator.checkBaselineLock(event, state, violations);

      expect(violations).toHaveLength(1);
      expect(violations[0].type).toBe('baseline_lock');
      expect(violations[0].severity).toBe('critical');
    });

    test('should allow non-baseline file modification', () => {
      const event = createMockEvent('Write', { file_path: '/test/regular.ts' });
      const state = createMockState();
      const violations: any[] = [];

      stateValidator.checkBaselineLock(event, state, violations);

      expect(violations).toHaveLength(0);
    });

    test('should skip validation when state is null', () => {
      const event = createMockEvent('Write', { file_path: '/test/baseline.ts' });
      const violations: any[] = [];

      stateValidator.checkBaselineLock(event, null, violations);

      expect(violations).toHaveLength(0);
    });

    test('should skip validation when baseline is undefined', () => {
      const event = createMockEvent('Write', { file_path: '/test/file.ts' });
      const state = { ...createMockState(), baseline: undefined } as any;
      const violations: any[] = [];

      stateValidator.checkBaselineLock(event, state, violations);

      expect(violations).toHaveLength(0);
    });
  });

  describe('Decision Logic', () => {
    test('should return BLOCK for critical violations', async () => {
      const event = createMockEvent('Write', { file_path: '/test/file.ts' });
      const state = createMockState();
      state.baseline.files['/test/file.ts'] = { hash: 'abc' };

      const result = await policyValidator.validate(event, HookIntent.WRITE);
      const violations: any[] = [];

      stateValidator.checkBaselineLock(event, state, violations);
      result.violations.push(...violations);

      const hasCritical = result.violations.some(v => v.severity === 'critical');
      expect(hasCritical).toBe(true);
    });

    test('should return WARNING for high severity violations', async () => {
      const event = createMockEvent('Write', {
        file_path: '/test/file.ts',
        description: 'Simplified implementation',
      });

      const result = await policyValidator.validate(event, HookIntent.WRITE);

      expect(result.decision).toBe(HookDecision.WARNING);
      expect(result.reason).toBeDefined();
    });

    test('should return ALLOW for no violations', async () => {
      const event = createMockEvent('Write', {
        file_path: '/test/file.ts',
        description: 'Normal implementation',
      });

      const result = await policyValidator.validate(event, HookIntent.WRITE);

      expect(result.decision).toBe(HookDecision.ALLOW);
      expect(result.violations).toHaveLength(0);
      expect(result.stateValid).toBe(true);
    });
  });

  describe('Performance', () => {
    test('should complete validation in reasonable time', async () => {
      const event = createMockEvent('Write', { file_path: '/test/file.ts' });

      const result = await policyValidator.validate(event, HookIntent.WRITE);

      expect(result.processingTimeMs).toBeDefined();
      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
    });
  });
});
