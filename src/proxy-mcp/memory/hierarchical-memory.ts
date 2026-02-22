/**
 * Hierarchical Memory System
 * Integrates short-term, long-term (Qdrant), and episodic memory layers
 */

import { QdrantMemoryClient, QdrantConfig } from './qdrant-client';
import { TFIDFEmbedding, EmbeddingProvider } from './embeddings';

export type MemoryLayer = 'short-term' | 'long-term' | 'episodic';

export interface MemoryEntry {
  key: string;
  content: string;
  layer: MemoryLayer;
  metadata?: Record<string, unknown>;
  timestamp: number;
}

export class HierarchicalMemory {
  private qdrantClient: QdrantMemoryClient;
  private embedding: EmbeddingProvider;
  private shortTerm: Map<string, MemoryEntry> = new Map();
  private connected: boolean = false;

  constructor(
    qdrantConfig?: Partial<QdrantConfig>,
    embedding?: EmbeddingProvider
  ) {
    this.qdrantClient = new QdrantMemoryClient(qdrantConfig);
    this.embedding = embedding || new TFIDFEmbedding();
  }

  async connect(): Promise<void> {
    await this.qdrantClient.connect();
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    await this.qdrantClient.disconnect();
    this.connected = false;
  }

  async store(key: string, content: string, layer: MemoryLayer = 'short-term', metadata?: Record<string, unknown>): Promise<void> {
    const entry: MemoryEntry = {
      key,
      content,
      layer,
      metadata,
      timestamp: Date.now(),
    };

    if (layer === 'short-term') {
      this.shortTerm.set(key, entry);
      return;
    }

    if (layer === 'long-term') {
      if (!this.connected) throw new Error('Not connected to Qdrant');
      const vector = this.embedding.toVector(content);
      await this.qdrantClient.upsert(key, vector, {
        content,
        layer,
        ...metadata,
        storedAt: new Date().toISOString(),
      });
      return;
    }
  }

  async recall(query: string, layer?: MemoryLayer, limit: number = 5): Promise<MemoryEntry[]> {
    const results: MemoryEntry[] = [];

    // Search short-term (simple text match)
    if (!layer || layer === 'short-term') {
      const queryLower = query.toLowerCase();
      for (const entry of this.shortTerm.values()) {
        if (entry.content.toLowerCase().includes(queryLower) || entry.key.toLowerCase().includes(queryLower)) {
          results.push(entry);
        }
      }
    }

    // Search long-term (vector similarity)
    if ((!layer || layer === 'long-term') && this.connected) {
      const vector = this.embedding.toVector(query);
      const qdrantResults = await this.qdrantClient.search(vector, limit);
      for (const r of qdrantResults) {
        results.push({
          key: String(r.id),
          content: String(r.payload.content || ''),
          layer: 'long-term',
          metadata: r.payload,
          timestamp: Date.now(),
        });
      }
    }

    return results.slice(0, limit);
  }

  async promote(key: string, fromLayer: MemoryLayer, toLayer: MemoryLayer): Promise<void> {
    if (fromLayer === 'short-term' && toLayer === 'long-term') {
      const entry = this.shortTerm.get(key);
      if (!entry) throw new Error(`Key "${key}" not found in short-term memory`);
      await this.store(key, entry.content, 'long-term', entry.metadata);
      this.shortTerm.delete(key);
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  getShortTermEntries(): MemoryEntry[] {
    return Array.from(this.shortTerm.values());
  }

  getStats(): { shortTerm: number; longTerm: string; connected: boolean } {
    return {
      shortTerm: this.shortTerm.size,
      longTerm: this.connected ? 'connected' : 'unavailable',
      connected: this.connected,
    };
  }

  async healthCheck(): Promise<boolean> {
    if (!this.connected) {
      return false;
    }
    return await this.qdrantClient.healthCheck();
  }
}

export { QdrantMemoryClient, QdrantConfig } from './qdrant-client';
export { TFIDFEmbedding, EmbeddingProvider } from './embeddings';
