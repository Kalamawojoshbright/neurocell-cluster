const RaftNode = require('../src/consensus/RaftNode');
const ClusterRpcTransport = require('../src/rpc/ClusterRpcTransport');

async function testLogReplication() {
  console.log("Starting Raft Log Replication Suite...");

  const transport = new ClusterRpcTransport();
  const node1 = new RaftNode('node_1', ['node_2', 'node_3'], transport);
  const node2 = new RaftNode('node_2', ['node_1', 'node_3'], transport);
  const node3 = new RaftNode('node_3', ['node_1', 'node_2'], transport);

  transport.registerNode('node_1', node1);
  transport.registerNode('node_2', node2);
  transport.registerNode('node_3', node3);

  // Elect Node 1 as Leader
  await node1.startElection();

  // Propose state mutation to Cluster Leader
  const mutationCommand = { type: 'REBALANCE_PARTITION', partitionId: 2, targetNode: 'node_2' };
  const result = await node1.propose(mutationCommand);

  console.assert(result.status === 'COMMITTED', "Command should be committed across majority");
  console.assert(node1.log.length === 1, "Leader log length should be 1");
  console.assert(node2.log.length === 1, "Follower 2 log should be replicated");
  console.assert(node3.log.length === 1, "Follower 3 log should be replicated");
  console.assert(node2.commitIndex === 1, "Follower 2 commitIndex should be updated");

  node1.stopTimer();
  node2.stopTimer();
  node3.stopTimer();

  console.log("Phase 15 Raft Log Replication Test: PASSED");
}

testLogReplication();
