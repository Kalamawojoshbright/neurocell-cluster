/**
 * Phase 23 Stage 2: Scatter-Gather Vector Query Coordinator
 * Fans out k-NN queries across distributed partition indices, aggregates candidate results,
 * and performs global ranking across partition boundaries.
 */
class ScatterGatherCoordinator {
  constructor(partitionNodes = []) {
    // Array of active partition VectorIndexManager instances or RPC client stubs
    this.partitionNodes = partitionNodes;
  }

  /**
   * Register a new partition node into the coordinator pool.
   */
  registerPartition(node) {
    this.partitionNodes.push(node);
  }

  /**
   * Execute distributed vector search across all partitions.
   * @param {Array<number>|Float32Array} queryVector
   * @param {number} topK - Global top K results to return
   * @param {Object|null} metadataFilter - Metadata key-value filters
   * @returns {Promise<Array<Object>>} Globally ranked top K matches
   */
  async executeSearch(queryVector, topK = 10, metadataFilter = null) {
    if (this.partitionNodes.length === 0) {
      return [];
    }

    // 1. Scatter: Parallel search dispatch across all active partitions
    const partitionPromises = this.partitionNodes.map(async (node) => {
      try {
        // Support both local synchronous search and async RPC calls
        return await node.search(queryVector, topK, metadataFilter);
      } catch (err) {
        console.error(`[ScatterGatherCoordinator] Partition ${node.partitionId} failed search:`, err.message);
        return [];
      }
    });

    const partitionResults = await Promise.all(partitionPromises);

    // 2. Gather: Flatten candidate matches from all partitions
    const candidatePool = [];
    for (const resList of partitionResults) {
      for (const candidate of resList) {
        candidatePool.push(candidate);
      }
    }

    if (candidatePool.length === 0) {
      return [];
    }

    // Determine ranking order from the first partition's metric setting (default: descending for Cosine/Dot)
    const metric = this.partitionNodes[0].metric || 'cosine';
    const isAscending = metric === 'euclidean';

    // 3. Global Reduce & Merge Sort
    candidatePool.sort((a, b) => {
      return isAscending ? a.score - b.score : b.score - a.score;
    });

    // 4. Return top-K globally ranked candidates
    return candidatePool.slice(0, topK);
  }
}

module.exports = ScatterGatherCoordinator;
