class PartitionRebalancer {
  constructor(raftNode, activePartitions = new Map()) {
    this.raftNode = raftNode;
    // partitionId -> nodeId mapping
    this.partitionMap = activePartitions;
  }

  assignPartition(partitionId, nodeId) {
    this.partitionMap.set(partitionId, nodeId);
  }

  getPartitionOwner(partitionId) {
    return this.partitionMap.get(partitionId);
  }

  async handleNodeFailure(failedNodeId, availableNodes) {
    if (this.raftNode.state !== 'LEADER') {
      return { rebalanced: false, reason: 'NOT_LEADER' };
    }

    if (availableNodes.length === 0) {
      throw new Error("No available healthy nodes for rebalancing");
    }

    const orphanedPartitions = [];
    for (const [partitionId, nodeId] of this.partitionMap.entries()) {
      if (nodeId === failedNodeId) {
        orphanedPartitions.push(partitionId);
      }
    }

    const reassignments = [];
    let targetIndex = 0;

    for (const partitionId of orphanedPartitions) {
      const newOwner = availableNodes[targetIndex % availableNodes.length];
      this.partitionMap.set(partitionId, newOwner);
      reassignments.push({ partitionId, newOwner });
      targetIndex++;
    }

    // Commit rebalancing decision to the Raft log
    const logResult = await this.raftNode.propose({
      type: 'REBALANCE_PARTITIONS',
      failedNodeId,
      reassignments
    });

    return {
      rebalanced: logResult.status === 'COMMITTED',
      reassignments
    };
  }
}

module.exports = PartitionRebalancer;
