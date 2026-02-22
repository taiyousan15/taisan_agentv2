/**
 * Memory Connection Manager
 * Singleton manager for HierarchicalMemory with auto-connect/reconnect
 */

import { HierarchicalMemory, QdrantConfig } from './hierarchical-memory';
import { TFIDFEmbedding } from './embeddings';

export interface ConnectionManagerConfig {
  readonly qdrant?: Partial<QdrantConfig>;
  readonly healthCheckIntervalMs?: number;
  readonly reconnectDelayMs?: number;
}

const DEFAULT_CONFIG: Required<Omit<ConnectionManagerConfig, 'qdrant'>> = {
  healthCheckIntervalMs: 60000, // 60s
  reconnectDelayMs: 5000, // 5s
};

export class MemoryConnectionManager {
  private static instance: MemoryConnectionManager | null = null;

  private memory: HierarchicalMemory;
  private qdrantAvailable: boolean = false;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private config: Required<Omit<ConnectionManagerConfig, 'qdrant'>> & { qdrant?: Partial<QdrantConfig> };
  private lastHealthCheck: number = 0;
  private reconnecting: boolean = false;

  private constructor(config: ConnectionManagerConfig = {}) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    };

    this.memory = new HierarchicalMemory(
      this.config.qdrant,
      new TFIDFEmbedding()
    );
  }

  static getInstance(config?: ConnectionManagerConfig): MemoryConnectionManager {
    if (!MemoryConnectionManager.instance) {
      MemoryConnectionManager.instance = new MemoryConnectionManager(config);
    }
    return MemoryConnectionManager.instance;
  }

  static resetInstance(): void {
    if (MemoryConnectionManager.instance) {
      MemoryConnectionManager.instance.stopHealthCheck();
    }
    MemoryConnectionManager.instance = null;
  }

  async initialize(): Promise<void> {
    try {
      await this.connectToQdrant();
      this.startHealthCheck();
    } catch (error) {
      this.handleConnectionFailure(error);
    }
  }

  private async connectToQdrant(): Promise<void> {
    try {
      await this.memory.connect();
      this.qdrantAvailable = true;
      this.lastHealthCheck = Date.now();
      console.debug('[MemoryConnectionManager] Connected to Qdrant successfully');
    } catch (error) {
      throw new Error(`Qdrant connection failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private handleConnectionFailure(error: unknown): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn(`[MemoryConnectionManager] Qdrant unavailable: ${errorMessage}`);
    console.warn('[MemoryConnectionManager] Falling back to short-term memory only');
    this.qdrantAvailable = false;
  }

  private startHealthCheck(): void {
    if (this.healthCheckInterval) {
      return;
    }

    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck().catch(error => {
        console.debug('[MemoryConnectionManager] Health check error:', error instanceof Error ? error.message : String(error));
      });
    }, this.config.healthCheckIntervalMs);
  }

  private stopHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  private async performHealthCheck(): Promise<void> {
    this.lastHealthCheck = Date.now();

    if (this.qdrantAvailable) {
      const isHealthy = await this.memory.healthCheck();
      if (!isHealthy) {
        console.warn('[MemoryConnectionManager] Qdrant health check failed');
        this.qdrantAvailable = false;
        await this.attemptReconnect();
      }
    } else {
      await this.attemptReconnect();
    }
  }

  private async attemptReconnect(): Promise<void> {
    if (this.reconnecting) {
      return;
    }

    this.reconnecting = true;
    console.debug('[MemoryConnectionManager] Attempting to reconnect to Qdrant...');

    try {
      await new Promise(resolve => setTimeout(resolve, this.config.reconnectDelayMs));
      await this.connectToQdrant();
      this.reconnecting = false;
    } catch (error) {
      this.reconnecting = false;
      console.debug('[MemoryConnectionManager] Reconnection failed, will retry later');
    }
  }

  getMemory(): HierarchicalMemory {
    return this.memory;
  }

  isQdrantConnected(): boolean {
    return this.qdrantAvailable && this.memory.isConnected();
  }

  getLastHealthCheckTime(): number {
    return this.lastHealthCheck;
  }

  async shutdown(): Promise<void> {
    this.stopHealthCheck();

    if (this.qdrantAvailable) {
      try {
        await this.memory.disconnect();
      } catch (error) {
        console.debug('[MemoryConnectionManager] Disconnect error:', error instanceof Error ? error.message : String(error));
      }
    }

    this.qdrantAvailable = false;
    console.debug('[MemoryConnectionManager] Shutdown complete');
  }
}
