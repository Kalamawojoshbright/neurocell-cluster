class GraphPartitioner {
  constructor(numPartitions = 4) {
    this.numPartitions = numPartitions;
    this.partitions = new Map();
  }

  assignPartition(nodeId, neighbors = []) {
    // Check if neighbors already have assigned partitions (Label Propagation concept)
    const neighborPartitions = new Map();
    for (const n of neighbors) {
      if (this.partitions.has(n)) {
        const p = this.partitions.get(n);
        neighborPartitions.set(p, (neighborPartitions.get(p) || 0) + 1);
      }
    }

    if (neighborPartitions.size > 0) {
      // Assign to the partition shared by the majority of neighbors
      let bestPartition = -1;
      let maxCount = -1;
      for (const [p, count] of neighborPartitions.entries()) {
        if (count > maxCount) {
          maxCount = count;
          bestPartition = p;
        }
      }
      this.partitions.set(nodeId, bestPartition);
      return bestPartition;
    }

    // Extract community prefix (e.g. "cell_C0_1" -> "C0") to co-locate clusters
    const match = nodeId.match(/cell_([A-Za-z0-9]+)_/);
    if (match) {
      const communityKey = match[1];
      const partitionId = Math.abs(this.hash(communityKey)) % this.numPartitions;
      this.partitions.set(nodeId, partitionId);
      return partitionId;
    }

    // Fallback hashing
    const partitionId = Math.abs(this.hash(nodeId)) % this.numPartitions;
    this.partitions.set(nodeId, partitionId);
    return partitionId;
  }

  calculateEdgeBoundaryRatio(edges) {
    if (edges.length === 0) return 0;
    let cutEdges = 0;
    for (const { source, target } of edges) {
      const p1 = this.partitions.get(source);
      const p2 = this.partitions.get(target);
      if (p1 !== undefined && p2 !== undefined && p1 !== p2) {
        cutEdges++;
      }
    }
    return (cutEdges / edges.length) * 100;
  }

  hash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }
}

module.exports = GraphPartitioner;
