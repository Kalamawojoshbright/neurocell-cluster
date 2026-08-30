class ClusterRpcTransport {
  constructor(nodeId) {
    this.nodeId = nodeId;
    this.handlers = new Map();
  }

  registerHandler(method, fn) {
    this.handlers.set(method, fn);
  }

  async send(targetNodeId, method, payload) {
    if (!this.handlers.has(method)) {
      throw new Error(`RPC method ${method} not registered`);
    }
    return this.handlers.get(method)(payload);
  }
}

module.exports = ClusterRpcTransport;
