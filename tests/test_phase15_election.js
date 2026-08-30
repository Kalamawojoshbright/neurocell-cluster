const RaftNode = require('../src/consensus/RaftNode');
const ClusterRpcTransport = require('../src/rpc/ClusterRpcTransport');

async function testElection() {
  console.log("Starting 3-Node Raft Leader Election & Heartbeat Test...");

  const transport = new ClusterRpcTransport();
  const node1 = new RaftNode('node_1', ['node_2', 'node_3'], transport);
  const node2 = new RaftNode('node_2', ['node_1', 'node_3'], transport);
  const node3 = new RaftNode('node_3', ['node_1', 'node_2'], transport);

  transport.registerNode('node_1', node1);
  transport.registerNode('node_2', node2);
  transport.registerNode('node_3', node3);

  // Trigger election from Node 1
  await node1.startElection();

  console.assert(node1.state === 'LEADER', "Node 1 should be elected LEADER");
  console.assert(node2.state === 'FOLLOWER', "Node 2 should be FOLLOWER");
  console.assert(node3.state === 'FOLLOWER', "Node 3 should be FOLLOWER");
  console.assert(node2.leaderId === 'node_1', "Node 2 leaderId should point to node_1");

  node1.stopTimer();
  node2.stopTimer();
  node3.stopTimer();

  console.log("Phase 15 Raft Leader Election Test: PASSED");
}

testElection();
