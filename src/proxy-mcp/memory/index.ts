/**
 * Memory System - Exports
 */

export * from './types';
export { MemoryService, getMemoryService } from './service';
export { createStore, InMemoryStore, JsonlStore } from './store';

// Hierarchical Memory & Qdrant Integration
export { MemoryConnectionManager, ConnectionManagerConfig } from './connection-manager';
export { ConsolidationEngine, ConsolidationRule, ConsolidationResult } from './consolidation-engine';
export { HierarchicalMemory, MemoryEntry, MemoryLayer } from './hierarchical-memory';
export { QdrantMemoryClient, QdrantConfig } from './qdrant-client';
export { TFIDFEmbedding, EmbeddingProvider } from './embeddings';
