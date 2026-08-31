/**
 * Phase 23 Stage 1: Local Vector Index Manager
 * Manages local partition vector embeddings, indexing, and k-NN distance calculations.
 */
class VectorIndexManager {
  constructor(partitionId, metric = 'cosine') {
    this.partitionId = partitionId;
    this.metric = metric.toLowerCase(); // 'cosine' | 'euclidean' | 'dot'
    this.vectors = new Map(); // vectorId -> { vector: Float32Array, metadata: Object }
  }

  /**
   * Insert or update a vector embedding with associated metadata.
   */
  upsert(vectorId, values, metadata = {}) {
    if (!Array.isArray(values) && !(values instanceof Float32Array)) {
      throw new Error('[VectorIndexManager] Vector values must be an array or Float32Array');
    }
    const floatArray = values instanceof Float32Array ? values : new Float32Array(values);
    this.vectors.set(vectorId, { vector: floatArray, metadata });
    return { status: 'OK', vectorId, partitionId: this.partitionId };
  }

  /**
   * Delete a vector by ID.
   */
  delete(vectorId) {
    const existed = this.vectors.delete(vectorId);
    return { status: existed ? 'DELETED' : 'NOT_FOUND', vectorId };
  }

  /**
   * Perform k-NN local search against indexed vectors.
   */
  search(queryVector, topK = 10, metadataFilter = null) {
    const q = queryVector instanceof Float32Array ? queryVector : new Float32Array(queryVector);
    const results = [];

    for (const [id, entry] of this.vectors.entries()) {
      // Apply optional metadata filter before computing similarity
      if (metadataFilter && !this._matchesFilter(entry.metadata, metadataFilter)) {
        continue;
      }

      const score = this._computeScore(q, entry.vector);
      results.push({
        id,
        score,
        metadata: entry.metadata,
        partitionId: this.partitionId
      });
    }

    // Sort by score (descending for Cosine/Dot, ascending for Euclidean)
    results.sort((a, b) => {
      return this.metric === 'euclidean' ? a.score - b.score : b.score - a.score;
    });

    return results.slice(0, topK);
  }

  _computeScore(v1, v2) {
    if (v1.length !== v2.length) {
      throw new Error(`[VectorIndexManager] Dimension mismatch: ${v1.length} vs ${v2.length}`);
    }

    if (this.metric === 'cosine') {
      let dot = 0, normA = 0, normB = 0;
      for (let i = 0; i < v1.length; i++) {
        dot += v1[i] * v2[i];
        normA += v1[i] * v1[i];
        normB += v2[i] * v2[i];
      }
      const denom = Math.sqrt(normA) * Math.sqrt(normB);
      return denom === 0 ? 0 : dot / denom;
    } 
    
    if (this.metric === 'euclidean') {
      let sumSq = 0;
      for (let i = 0; i < v1.length; i++) {
        const diff = v1[i] - v2[i];
        sumSq += diff * diff;
      }
      return Math.sqrt(sumSq);
    } 
    
    if (this.metric === 'dot') {
      let dot = 0;
      for (let i = 0; i < v1.length; i++) {
        dot += v1[i] * v2[i];
      }
      return dot;
    }

    throw new Error(`[VectorIndexManager] Unsupported metric: ${this.metric}`);
  }

  _matchesFilter(metadata, filter) {
    for (const [key, expectedValue] of Object.entries(filter)) {
      if (metadata[key] !== expectedValue) return false;
    }
    return true;
  }
}

module.exports = VectorIndexManager;
