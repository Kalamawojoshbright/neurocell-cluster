class ClusterStorageAdapter {
  constructor() {
    this.adjList = new Map();
  }

  async putRelationship(source, target, type) {
    if (!this.adjList.has(source)) this.adjList.set(source, []);
    if (!this.adjList.has(target)) this.adjList.set(target, []);
    this.adjList.get(source).push(target);
    this.adjList.get(target).push(source);
  }

  async getNeighbors(nodeId) {
    return this.adjList.get(nodeId) || [];
  }
}

module.exports = ClusterStorageAdapter;
