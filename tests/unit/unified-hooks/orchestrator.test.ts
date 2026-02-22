/**
 * Unified Hook Orchestrator Test
 *
 * 責務:
 * - Layer 1-4 の統合実行
 * - Fast Path ルーティング
 * - エラーハンドリング
 * - パフォーマンス最適化
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { UnifiedHookOrchestrator } from '../../../src/unified-hooks/orchestrator';
import { HookEvent, HookIntent, HookDecision } from '../../../src/unified-hooks/types';

// Mock all layers
jest.mock('../../../src/unified-hooks/layer-1', () => ({
  IntentRouter: jest.fn().mockImplementation(() => ({
    route: jest.fn(),
    getStats: jest.fn().mockReturnValue({
      cacheSize: 0,
      cacheHits: 0,
      cacheMisses: 0,
      hitRate: 0,
    }),
    clearCache: jest.fn(),
  })),
}));

jest.mock('../../../src/unified-hooks/layer-2', () => ({
  PolicyValidator: jest.fn().mockImplementation(() => ({
    validate: jest.fn(),
  })),
  StateValidator: jest.fn().mockImplementation(() => ({
    checkReadBeforeWrite: jest.fn(),
    checkBaselineLock: jest.fn(),
  })),
}));

jest.mock('../../../src/unified-hooks/layer-3', () => ({
  SecurityGate: jest.fn().mockImplementation(() => ({
    validate: jest.fn(),
  })),
}));

jest.mock('../../../src/unified-hooks/layer-4', () => ({
  MetricsRecorder: jest.fn().mockImplementation(() => ({
    record: jest.fn(),
    getStats: jest.fn().mockReturnValue({
      totalRecords: 0,
      bufferSize: 0,
    }),
  })),
  StatePersistence: jest.fn().mockImplementation(() => ({
    loadState: jest.fn().mockReturnValue(null),
    addToReadLog: jest.fn(),
    updateHandoff: jest.fn(),
  })),
}));

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

describe('Unified Hook Orchestrator', () => {
  let orchestrator: UnifiedHookOrchestrator;

  beforeEach(() => {
    jest.clearAllMocks();
    orchestrator = new UnifiedHookOrchestrator();
  });

  describe('Layer Orchestration', () => {
    test('should execute Layer 1 → 2 → 3 → 4 in sequence', async () => {
      const event = createMockEvent('Write', { file_path: '/test/file.ts', content: 'test' });

      // Mock layer responses
      const layer1 = orchestrator['layer1'];
      const layer2Policy = orchestrator['layer2Policy'];
      const layer3 = orchestrator['layer3'];

      (layer1.route as jest.Mock<any>).mockResolvedValue({
        intent: HookIntent.WRITE,
        allow: false,
        skipLayers: [],
        fastPath: false,
        cacheHit: false,
        processingTimeMs: 10,
      });

      (layer2Policy.validate as jest.Mock<any>).mockResolvedValue({
        decision: HookDecision.ALLOW,
        violations: [],
        skillRequirements: [],
        stateValid: true,
        processingTimeMs: 20,
      });

      (layer3.validate as jest.Mock<any>).mockResolvedValue({
        decision: HookDecision.ALLOW,
        threats: [],
        safetyIssues: [],
        processingTimeMs: 30,
      });

      const result = await orchestrator.process(event);

      expect(layer1.route).toHaveBeenCalledWith(event);
      expect(layer2Policy.validate).toHaveBeenCalledWith(event, HookIntent.WRITE);
      expect(layer3.validate).toHaveBeenCalledWith(event);
      expect(result.decision).toBe(HookDecision.ALLOW);
      expect(result.layer1).toBeDefined();
      expect(result.layer2).toBeDefined();
      expect(result.layer3).toBeDefined();
    });

    test('should skip Layer 2-3 when Fast Path enabled', async () => {
      const event = createMockEvent('Read', { file_path: '/test/file.ts' });

      const layer1 = orchestrator['layer1'];
      const layer2Policy = orchestrator['layer2Policy'];
      const layer3 = orchestrator['layer3'];

      (layer1.route as jest.Mock<any>).mockResolvedValue({
        intent: HookIntent.READ,
        allow: true,
        skipLayers: [2, 3],
        fastPath: true,
        cacheHit: false,
        processingTimeMs: 5,
      });

      const result = await orchestrator.process(event);

      expect(layer1.route).toHaveBeenCalledWith(event);
      expect(layer2Policy.validate).not.toHaveBeenCalled();
      expect(layer3.validate).not.toHaveBeenCalled();
      expect(result.decision).toBe(HookDecision.ALLOW);
      expect(result.fastPath).toBe(true);
    });

    test('should execute Layer 4 asynchronously', async () => {
      const event = createMockEvent('Read', { file_path: '/test/file.ts' });

      const layer1 = orchestrator['layer1'];
      const layer4Metrics = orchestrator['layer4Metrics'];

      (layer1.route as jest.Mock<any>).mockResolvedValue({
        intent: HookIntent.READ,
        allow: true,
        skipLayers: [2, 3],
        fastPath: true,
        cacheHit: false,
        processingTimeMs: 5,
      });

      const result = await orchestrator.process(event);

      expect(result.decision).toBe(HookDecision.ALLOW);

      // Layer 4 is async via setImmediate, so wait for it
      await new Promise(resolve => setImmediate(resolve));

      expect(layer4Metrics.record).toHaveBeenCalled();
    });

    test('should stop on Layer 1 block', async () => {
      const event = createMockEvent('Skill', { skill_name: 'test' });

      const layer1 = orchestrator['layer1'];
      const layer2Policy = orchestrator['layer2Policy'];

      (layer1.route as jest.Mock<any>).mockResolvedValue({
        intent: HookIntent.SKILL,
        allow: false,
        skipLayers: [],
        fastPath: false,
        cacheHit: false,
        processingTimeMs: 5,
        reason: 'Skill validation required',
      });

      const result = await orchestrator.process(event);

      expect(result.decision).toBe(HookDecision.BLOCK);
      expect(result.reason).toBe('Skill validation required');
      expect(layer2Policy.validate).not.toHaveBeenCalled();
    });

    test('should stop on Layer 2 block', async () => {
      const event = createMockEvent('Write', { file_path: '/baseline/file.ts' });

      const layer1 = orchestrator['layer1'];
      const layer2Policy = orchestrator['layer2Policy'];
      const layer3 = orchestrator['layer3'];

      (layer1.route as jest.Mock<any>).mockResolvedValue({
        intent: HookIntent.WRITE,
        allow: false,
        skipLayers: [],
        fastPath: false,
        cacheHit: false,
        processingTimeMs: 5,
      });

      (layer2Policy.validate as jest.Mock<any>).mockResolvedValue({
        decision: HookDecision.BLOCK,
        violations: [
          {
            type: 'baseline_lock',
            severity: 'critical',
            message: 'Baseline file locked',
          },
        ],
        skillRequirements: [],
        stateValid: false,
        processingTimeMs: 10,
        reason: 'Baseline file locked',
      });

      const result = await orchestrator.process(event);

      expect(result.decision).toBe(HookDecision.BLOCK);
      expect(result.reason).toBe('Baseline file locked');
      expect(layer3.validate).not.toHaveBeenCalled();
    });

    test('should stop on Layer 3 block', async () => {
      const event = createMockEvent('Bash', { command: 'rm -rf /' });

      const layer1 = orchestrator['layer1'];
      const layer2Policy = orchestrator['layer2Policy'];
      const layer3 = orchestrator['layer3'];

      (layer1.route as jest.Mock<any>).mockResolvedValue({
        intent: HookIntent.BASH,
        allow: false,
        skipLayers: [],
        fastPath: false,
        cacheHit: false,
        processingTimeMs: 5,
      });

      (layer2Policy.validate as jest.Mock<any>).mockResolvedValue({
        decision: HookDecision.ALLOW,
        violations: [],
        skillRequirements: [],
        stateValid: true,
        processingTimeMs: 10,
      });

      (layer3.validate as jest.Mock<any>).mockResolvedValue({
        decision: HookDecision.BLOCK,
        threats: [],
        safetyIssues: [
          {
            type: 'destructive_operation',
            severity: 'critical',
            description: 'Dangerous command detected',
          },
        ],
        processingTimeMs: 15,
        reason: 'Dangerous command detected',
      });

      const result = await orchestrator.process(event);

      expect(result.decision).toBe(HookDecision.BLOCK);
      expect(result.reason).toBe('Dangerous command detected');
    });
  });

  describe('Error Handling', () => {
    test('should handle Layer 1 errors gracefully', async () => {
      const event = createMockEvent('Read', { file_path: '/test/file.ts' });

      const layer1 = orchestrator['layer1'];
      (layer1.route as jest.Mock<any>).mockRejectedValue(new Error('Layer 1 error'));

      const result = await orchestrator.process(event);

      expect(result.decision).toBe(HookDecision.ALLOW);
      expect(result.reason).toBe('Hook system error - allowing operation');
    });

    test('should handle Layer 2 errors gracefully', async () => {
      const event = createMockEvent('Write', { file_path: '/test/file.ts' });

      const layer1 = orchestrator['layer1'];
      const layer2Policy = orchestrator['layer2Policy'];

      (layer1.route as jest.Mock<any>).mockResolvedValue({
        intent: HookIntent.WRITE,
        allow: false,
        skipLayers: [],
        fastPath: false,
        cacheHit: false,
        processingTimeMs: 5,
      });

      (layer2Policy.validate as jest.Mock<any>).mockRejectedValue(new Error('Layer 2 error'));

      const result = await orchestrator.process(event);

      expect(result.decision).toBe(HookDecision.ALLOW);
      expect(result.reason).toBe('Hook system error - allowing operation');
    });

    test('should handle Layer 3 errors gracefully', async () => {
      const event = createMockEvent('Bash', { command: 'ls -la' });

      const layer1 = orchestrator['layer1'];
      const layer2Policy = orchestrator['layer2Policy'];
      const layer3 = orchestrator['layer3'];

      (layer1.route as jest.Mock<any>).mockResolvedValue({
        intent: HookIntent.BASH,
        allow: false,
        skipLayers: [],
        fastPath: false,
        cacheHit: false,
        processingTimeMs: 5,
      });

      (layer2Policy.validate as jest.Mock<any>).mockResolvedValue({
        decision: HookDecision.ALLOW,
        violations: [],
        skillRequirements: [],
        stateValid: true,
        processingTimeMs: 10,
      });

      (layer3.validate as jest.Mock<any>).mockRejectedValue(new Error('Layer 3 error'));

      const result = await orchestrator.process(event);

      expect(result.decision).toBe(HookDecision.ALLOW);
      expect(result.reason).toBe('Hook system error - allowing operation');
    });

    test('should continue on Layer 4 errors (non-critical)', async () => {
      const event = createMockEvent('Read', { file_path: '/test/file.ts' });

      const layer1 = orchestrator['layer1'];
      const layer4Metrics = orchestrator['layer4Metrics'];

      (layer1.route as jest.Mock<any>).mockResolvedValue({
        intent: HookIntent.READ,
        allow: true,
        skipLayers: [2, 3],
        fastPath: true,
        cacheHit: false,
        processingTimeMs: 5,
      });

      (layer4Metrics.record as jest.Mock<any>).mockRejectedValue(new Error('Layer 4 error'));

      const result = await orchestrator.process(event);

      expect(result.decision).toBe(HookDecision.ALLOW);

      // Wait for async Layer 4
      await new Promise(resolve => setImmediate(resolve));

      // Error should be logged but not affect result
    });
  });

  describe('Statistics', () => {
    test('should return stats from all layers', () => {
      const stats = orchestrator.getStats();

      expect(stats.layer1).toBeDefined();
      expect(stats.layer4).toBeDefined();
    });

    test('should clear cache', () => {
      const layer1 = orchestrator['layer1'];
      orchestrator.clearCache();

      expect(layer1.clearCache).toHaveBeenCalled();
    });
  });
});
