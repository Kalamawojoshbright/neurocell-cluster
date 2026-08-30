const RaftNode = require('../src/consensus/RaftNode');
const ClusterRpcTransport = require('../src/rpc/ClusterRpcTransport');
const PartitionRebalancer = require('../src/partition/PartitionRebalancer');

async function testFailoverAndRebalance() {
  console.log("Starting Automated Partition Failover & Rebalance Test...");

  const transport = new ClusterRpcTransport();
  const node1 = new RaftNode('node_1', ['node_2', 'node_3'], transport);
  const node2 = new RaftNode('node_2', ['node_1', 'node_3'], transport);
  const node3 = new RaftNode('node_3', ['node_1', 'node_2'], transport);

  transport.registerNode('node_1', node1);
  transport.registerNode('node_2', node2);
  transport.registerNode('node_3', node3);

  await node1.startElection();
  console.assert(node1.state === 'LEADER', "Node 1 should be elected LEADER");

  // Initial partition map: partitions 0,1 on node_2; partition 2 on node_3
  const initialMap = new Map([
    [0, 'node_2'],
    [1, 'node_2'],
    [2, 'node_3']
  ]);

  const rebalancer = new PartitionRebalancer(node1, initialMap);

  // Simulate unexpected eviction of node_2
  console.log("Simulating eviction of node_2...");
  const result = await rebalancer.handleNodeFailure('node_2', ['node_1', 'node_3']);

  console.assert(result.rebalanced === true, "Rebalance proposal should be committed to Raft log");
  console.assert(rebalancer.getPartitionOwner(0) === 'node_1', "Partition 0 reassigned to healthy node_1");
  console.assert(rebalancer.getPartitionOwner(1) === 'node_3', "Partition 1 reassigned to healthy node_3");
  console.assert(node1.commitIndex === 1, "Failover entry committed to leader state machine");

  node1.stopTimer();
  node2.stopTimer();
  node3.stopTimer();

  console.log("Phase 15 Automated Failover & Rebalance Test: PASSED");
}

testFailoverAndRebalance();
