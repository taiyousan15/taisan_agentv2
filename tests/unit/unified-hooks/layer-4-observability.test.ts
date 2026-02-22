/**
 * Layer 4: Observability & State Update Test
 *
 * 責務:
 * - メトリクス記録
 * - 状態永続化 (差分管理)
 * - セッションハンドオフ生成
 * - Context Quality 監視
 * - 処理時間: 100-500ms (非ブロッキング)
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { MetricsRecorder } from '../../../src/unified-hooks/layer-4/metrics-recorder';
import { HookMetrics, HookDecision } from '../../../src/unified-hooks/types';
import * as fs from 'fs';

jest.mock('fs');

function createMockMetrics(overrides: Partial<HookMetrics> = {}): HookMetrics {
  return {
    timestamp: Date.now(),
    hookName: 'unified-hook',
    decision: HookDecision.ALLOW,
    processingTimeMs: 100,
    cacheHit: false,
    fastPath: true,
    layer1TimeMs: 10,
    layer2TimeMs: 20,
    layer3TimeMs: 30,
    layer4TimeMs: 40,
    ...overrides,
  };
}

describe('Layer 4: Observability & State Update', () => {
  let recorder: MetricsRecorder;

  beforeEach(() => {
    jest.clearAllMocks();
    recorder = new MetricsRecorder();

    // Mock fs functions
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    (fs.mkdirSync as jest.Mock).mockImplementation(() => undefined);
    (fs.appendFileSync as jest.Mock).mockImplementation(() => undefined);
    (fs.readFileSync as jest.Mock).mockReturnValue('');
  });

  describe('Metrics Recording', () => {
    test('should record metrics to buffer', async () => {
      const metrics = createMockMetrics();

      await recorder.record(metrics);

      const stats = recorder.getStats();
      expect(stats.bufferSize).toBe(1);
    });

    test('should accumulate multiple metrics in buffer', async () => {
      const metrics1 = createMockMetrics();
      const metrics2 = createMockMetrics();

      await recorder.record(metrics1);
      await recorder.record(metrics2);

      const stats = recorder.getStats();
      expect(stats.bufferSize).toBe(2);
    });

    test('should flush buffer when reaching 100 entries', async () => {
      // Fill buffer to 100
      for (let i = 0; i < 100; i++) {
        await recorder.record(createMockMetrics());
      }

      // Wait for async flush
      await new Promise(resolve => setImmediate(resolve));

      expect(fs.appendFileSync).toHaveBeenCalled();
    });

    test('should create directory if not exists', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      // Fill buffer to trigger flush
      for (let i = 0; i < 100; i++) {
        await recorder.record(createMockMetrics());
      }

      await new Promise(resolve => setImmediate(resolve));

      expect(fs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('.claude/hooks/data'),
        { recursive: true }
      );
    });

    test('should append metrics as JSONL', async () => {
      const metrics = createMockMetrics();

      // Fill buffer to trigger flush
      for (let i = 0; i < 100; i++) {
        await recorder.record(metrics);
      }

      await new Promise(resolve => setImmediate(resolve));

      expect(fs.appendFileSync).toHaveBeenCalledWith(
        expect.stringContaining('unified-metrics.jsonl'),
        expect.stringContaining(JSON.stringify(metrics)),
        'utf8'
      );
    });

    test('should handle recording errors gracefully', async () => {
      (fs.appendFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('Disk full');
      });

      // Should not throw
      for (let i = 0; i < 100; i++) {
        await expect(recorder.record(createMockMetrics())).resolves.not.toThrow();
      }
    });
  });

  describe('Statistics', () => {
    test('should return total records from file', () => {
      const mockContent = `${JSON.stringify(createMockMetrics())}\n${JSON.stringify(createMockMetrics())}\n`;
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(mockContent);

      const stats = recorder.getStats();

      expect(stats.totalRecords).toBe(2);
    });

    test('should return buffer size', async () => {
      await recorder.record(createMockMetrics());
      await recorder.record(createMockMetrics());

      const stats = recorder.getStats();

      expect(stats.bufferSize).toBe(2);
    });

    test('should handle missing metrics file', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const stats = recorder.getStats();

      expect(stats.totalRecords).toBe(0);
    });

    test('should handle read errors gracefully', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('Read error');
      });

      const stats = recorder.getStats();

      expect(stats.totalRecords).toBe(0);
    });
  });

  describe('Recent Metrics Retrieval', () => {
    test('should return recent metrics', () => {
      const metric1 = createMockMetrics({ timestamp: 1000 });
      const metric2 = createMockMetrics({ timestamp: 2000 });
      const metric3 = createMockMetrics({ timestamp: 3000 });

      const mockContent = `${JSON.stringify(metric1)}\n${JSON.stringify(metric2)}\n${JSON.stringify(metric3)}\n`;
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(mockContent);

      const recent = recorder.getRecentMetrics(2);

      expect(recent).toHaveLength(2);
      expect(recent[0].timestamp).toBe(2000);
      expect(recent[1].timestamp).toBe(3000);
    });

    test('should return all metrics if count exceeds available', () => {
      const metric1 = createMockMetrics();
      const mockContent = `${JSON.stringify(metric1)}\n`;
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(mockContent);

      const recent = recorder.getRecentMetrics(10);

      expect(recent).toHaveLength(1);
    });

    test('should return empty array if file does not exist', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const recent = recorder.getRecentMetrics(10);

      expect(recent).toEqual([]);
    });

    test('should handle read errors gracefully', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('Read error');
      });

      const recent = recorder.getRecentMetrics(10);

      expect(recent).toEqual([]);
    });

    test('should ignore empty lines', () => {
      const metric1 = createMockMetrics();
      const mockContent = `${JSON.stringify(metric1)}\n\n\n${JSON.stringify(metric1)}\n`;
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(mockContent);

      const recent = recorder.getRecentMetrics(10);

      expect(recent).toHaveLength(2);
    });
  });

  describe('Buffer Management', () => {
    test('should clear buffer after flush', async () => {
      // Fill buffer to 100
      for (let i = 0; i < 100; i++) {
        await recorder.record(createMockMetrics());
      }

      // Wait for flush
      await new Promise(resolve => setImmediate(resolve));

      const stats = recorder.getStats();
      expect(stats.bufferSize).toBe(0);
    });

    test('should not flush if buffer is empty', async () => {
      // Trigger flush with empty buffer
      await new Promise(resolve => setImmediate(resolve));

      expect(fs.appendFileSync).not.toHaveBeenCalled();
    });

    test('should handle partial buffer flush', async () => {
      // Add 50 entries (below threshold)
      for (let i = 0; i < 50; i++) {
        await recorder.record(createMockMetrics());
      }

      const stats = recorder.getStats();
      expect(stats.bufferSize).toBe(50);
      expect(fs.appendFileSync).not.toHaveBeenCalled();
    });
  });

  describe('Non-Blocking Behavior', () => {
    test('should not block on record call', async () => {
      const metrics = createMockMetrics();

      const startTime = performance.now();
      await recorder.record(metrics);
      const elapsed = performance.now() - startTime;

      // Record should complete immediately (< 10ms)
      expect(elapsed).toBeLessThan(10);
    });

    test('should flush asynchronously', async () => {
      // Mock slow file write
      (fs.appendFileSync as jest.Mock).mockImplementation(() => {
        // Simulate slow I/O
        const start = Date.now();
        while (Date.now() - start < 10) {
          // Busy wait
        }
      });

      const startTime = performance.now();

      // Fill buffer to trigger flush
      for (let i = 0; i < 100; i++) {
        await recorder.record(createMockMetrics());
      }

      const elapsed = performance.now() - startTime;

      // Even with slow I/O, recording should be fast
      expect(elapsed).toBeLessThan(100);
    });
  });

  describe('Metrics Content Validation', () => {
    test('should record all required fields', async () => {
      const metrics = createMockMetrics({
        hookName: 'test-hook',
        decision: HookDecision.BLOCK,
        processingTimeMs: 250,
        cacheHit: true,
        fastPath: false,
        layer1TimeMs: 50,
        layer2TimeMs: 100,
        layer3TimeMs: 50,
        layer4TimeMs: 50,
      });

      await recorder.record(metrics);

      const stats = recorder.getStats();
      expect(stats.bufferSize).toBe(1);
    });

    test('should record metrics with optional fields undefined', async () => {
      const metrics = createMockMetrics({
        layer2TimeMs: undefined,
        layer3TimeMs: undefined,
      });

      await recorder.record(metrics);

      const stats = recorder.getStats();
      expect(stats.bufferSize).toBe(1);
    });
  });

  describe('File Path Handling', () => {
    test('should use correct metrics file path', async () => {
      for (let i = 0; i < 100; i++) {
        await recorder.record(createMockMetrics());
      }

      await new Promise(resolve => setImmediate(resolve));

      expect(fs.appendFileSync).toHaveBeenCalledWith(
        '.claude/hooks/data/unified-metrics.jsonl',
        expect.any(String),
        'utf8'
      );
    });
  });
});
