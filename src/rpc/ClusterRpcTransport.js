class ClusterRpcTransport {
  constructor(nodeId) {
    this.nodeId = nodeId;
    this.nodes = new Map();
  }

  registerNode(nodeId, instance) {
    this.nodes.set(nodeId, instance);
  }

  async send(targetNodeId, method, payload) {
    const target = this.nodes.get(targetNodeId);
    if (!target) {
      throw new Error(`Node ${targetNodeId} unreachable`);
    }
    if (typeof target[method] === 'function') {
      return target[method](payload.term, payload.candidateId || payload.leaderId);
    }
    throw new Error(`Method ${method} not supported`);
  }
}

module.exports = ClusterRpcTransport;
