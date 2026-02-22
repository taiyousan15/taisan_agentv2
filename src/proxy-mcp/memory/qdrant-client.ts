/**
 * Qdrant Memory Client
 * Connects to Qdrant vector DB for long-term memory storage
 */

import { QdrantClient as QdrantSDK } from '@qdrant/js-client-rest';

export interface QdrantConfig {
  url: string;
  collectionName: string;
  vectorSize: number;
  apiKey?: string;
}

const DEFAULT_CONFIG: QdrantConfig = {
  url: process.env.QDRANT_URL || 'http://localhost:6333',
  collectionName: process.env.QDRANT_COLLECTION_NAME || 'taisun_memory',
  vectorSize: 384, // all-MiniLM-L6-v2 dimension
  apiKey: process.env.QDRANT_API_KEY,
};

export class QdrantMemoryClient {
  private client: QdrantSDK | null = null;
  private config: QdrantConfig;

  constructor(config: Partial<QdrantConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async connect(): Promise<void> {
    this.client = new QdrantSDK({
      url: this.config.url,
      apiKey: this.config.apiKey,
    });
    await this.ensureCollection();
  }

  async disconnect(): Promise<void> {
    this.client = null;
  }

  async healthCheck(): Promise<boolean> {
    try {
      if (!this.client) return false;
      const result = await this.client.getCollections();
      return Array.isArray(result.collections);
    } catch {
      return false;
    }
  }

  async ensureCollection(): Promise<void> {
    if (!this.client) throw new Error('Not connected');

    const collections = await this.client.getCollections();
    const exists = collections.collections.some(
      c => c.name === this.config.collectionName
    );

    if (!exists) {
      await this.client.createCollection(this.config.collectionName, {
        vectors: {
          size: this.config.vectorSize,
          distance: 'Cosine',
        },
      });
    }
  }

  async upsert(
    id: string,
    vector: number[],
    payload: Record<string, unknown>
  ): Promise<void> {
    if (!this.client) throw new Error('Not connected');

    await this.client.upsert(this.config.collectionName, {
      wait: true,
      points: [
        {
          id,
          vector,
          payload,
        },
      ],
    });
  }

  async search(
    vector: number[],
    limit: number = 5,
    filter?: Record<string, unknown>
  ): Promise<Array<{ id: string | number; score: number; payload: Record<string, unknown> }>> {
    if (!this.client) throw new Error('Not connected');

    const results = await this.client.search(this.config.collectionName, {
      vector,
      limit,
      filter: filter as any,
      with_payload: true,
    });

    return results.map(r => ({
      id: r.id,
      score: r.score,
      payload: (r.payload || {}) as Record<string, unknown>,
    }));
  }

  async delete(id: string): Promise<void> {
    if (!this.client) throw new Error('Not connected');

    await this.client.delete(this.config.collectionName, {
      wait: true,
      points: [id],
    });
  }

  getConfig(): QdrantConfig {
    return { ...this.config };
  }
}
