/**
 * Embedding Provider
 * TF-IDF based embedding for MVP, swappable to sentence-transformers later
 */

export interface EmbeddingProvider {
  toVector(text: string): number[];
  getDimension(): number;
}

/**
 * TF-IDF based embedding (reuses logic from semantic.ts)
 * Produces fixed-dimension vectors for Qdrant storage
 */
export class TFIDFEmbedding implements EmbeddingProvider {
  private readonly dimension: number;
  private vocabulary: Map<string, number> = new Map();
  private vocabIndex: number = 0;

  constructor(dimension: number = 384) {
    this.dimension = dimension;
  }

  toVector(text: string): number[] {
    const tokens = this.tokenize(text);
    const vector = new Array(this.dimension).fill(0);

    if (tokens.length === 0) return vector;

    // Build token frequency
    const freq: Map<string, number> = new Map();
    for (const token of tokens) {
      freq.set(token, (freq.get(token) || 0) + 1);
    }

    // Map tokens to vector positions via hashing
    for (const [token, count] of freq.entries()) {
      const index = this.hashToken(token) % this.dimension;
      vector[index] += count / tokens.length;
    }

    // L2 normalize
    const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
    if (norm > 0) {
      for (let i = 0; i < vector.length; i++) {
        vector[i] /= norm;
      }
    }

    return vector;
  }

  getDimension(): number {
    return this.dimension;
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(token => token.length > 2);
  }

  private hashToken(token: string): number {
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
      const char = token.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }
}
