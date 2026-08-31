/**
 * Phase 23 Stage 3: Hybrid Filtered Vector Search Engine
 * Combines structured query predicate evaluation ($eq, $in, $gt, $lt)
 * with similarity search across local and distributed vector indices.
 */
class FilteredVectorSearch {
  constructor(vectorIndexManager) {
    this.indexManager = vectorIndexManager;
  }

  /**
   * Evaluate complex metadata condition predicates against target item metadata.
   */
  matchesPredicate(metadata, filterSpec) {
    if (!filterSpec || Object.keys(filterSpec).length === 0) {
      return true;
    }

    for (const [key, condition] of Object.entries(filterSpec)) {
      const val = metadata[key];

      if (typeof condition === 'object' && condition !== null && !Array.isArray(condition)) {
        if ('$eq' in condition && val !== condition.$eq) return false;
        if ('$in' in condition && Array.isArray(condition.$in) && !condition.$in.includes(val)) return false;
        if ('$gt' in condition && !(val > condition.$gt)) return false;
        if ('$lt' in condition && !(val < condition.$lt)) return false;
      } else {
        // Direct value equality shortcut
        if (val !== condition) return false;
      }
    }

    return true;
  }

  /**
   * Perform hybrid vector search with advanced metadata predicate filtering.
   */
  searchWithPredicate(queryVector, filterSpec = {}, topK = 10) {
    const results = [];
    const q = queryVector instanceof Float32Array ? queryVector : new Float32Array(queryVector);

    for (const [id, entry] of this.indexManager.vectors.entries()) {
      if (!this.matchesPredicate(entry.metadata, filterSpec)) {
        continue;
      }

      const score = this.indexManager._computeScore(q, entry.vector);
      results.push({
        id,
        score,
        metadata: entry.metadata,
        partitionId: this.indexManager.partitionId
      });
    }

    const isAscending = this.indexManager.metric === 'euclidean';
    results.sort((a, b) => (isAscending ? a.score - b.score : b.score - a.score));

    return results.slice(0, topK);
  }
}

module.exports = FilteredVectorSearch;
