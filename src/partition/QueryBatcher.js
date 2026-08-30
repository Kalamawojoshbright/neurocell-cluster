class QueryBatcher {
  constructor(storageAdapter, maxBatchSize = 15, lingerMs = 2000) {
    this.storage = storageAdapter;
    this.maxBatchSize = maxBatchSize;
    this.lingerMs = lingerMs;
    this.cache = new Map();
  }

  async getNeighbors(nodeId) {
    if (this.cache.has(nodeId)) {
      return this.cache.get(nodeId);
    }
    const res = await this.storage.getNeighbors(nodeId);
    this.cache.set(nodeId, res);
    return res;
  }
}

module.exports = QueryBatcher;
