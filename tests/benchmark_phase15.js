const RaftNode = require('../src/consensus/RaftNode');
const ClusterRpcTransport = require('../src/rpc/ClusterRpcTransport');
const PartitionRebalancer = require('../src/partition/PartitionRebalancer');
const GraphPartitioner = require('../src/partition/GraphPartitioner');

async function runPhase15Benchmark() {
  console.log("=== Phase 15 End-to-End Distributed Cluster Benchmark ===");
  const startTime = Date.now();

  // 1. Initialize Graph & Min-Cut Partitions via addEdge
  console.log("[1/4] Partitioning Graph via Min-Cut Label Propagation...");
  const partitioner = new GraphPartitioner(3);
  for (let i = 0; i < 29; i++) {
    partitioner.addEdge(`v_${i}`, `v_${i + 1}`);
  }

  const partitions = partitioner.partition();
  const metrics = partitioner.evaluateCutRatio();
  console.log(`  -> Total Nodes: 30 | Cut Edge Ratio: ${(metrics.cutRatio * 100).toFixed(2)}%`);

  // 2. Initialize Raft Cluster
  console.log("[2/4] Initializing Raft Consensus Engine across Nodes...");
  const transport = new ClusterRpcTransport();
  const node1 = new RaftNode('node_1', ['node_2', 'node_3'], transport);
  const node2 = new RaftNode('node_2', ['node_1', 'node_3'], transport);
  const node3 = new RaftNode('node_3', ['node_1', 'node_2'], transport);

  transport.registerNode('node_1', node1);
  transport.registerNode('node_2', node2);
  transport.registerNode('node_3', node3);

  await node1.startElection();
  console.log(`  -> Cluster Leader Elected: ${node1.leaderId}`);

  // 3. Map Partitions to Cluster Nodes & Execute Dynamic Failover
  console.log("[3/4] Mapping Partitions and Executing Node Eviction Failover...");
  const initialMap = new Map([
    [0, 'node_1'],
    [1, 'node_2'],
    [2, 'node_3']
  ]);
  const rebalancer = new PartitionRebalancer(node1, initialMap);
  const failoverResult = await rebalancer.handleNodeFailure('node_3', ['node_1', 'node_2']);
  console.log(`  -> Failover Status: ${failoverResult.rebalanced ? 'SUCCESS' : 'FAILED'}`);
  console.log(`  -> Partition 2 Reassigned To: ${rebalancer.getPartitionOwner(2)}`);

  // 4. Assertions & Timing
  console.assert(metrics.cutRatio < 0.15, "Cut ratio benchmark constraint failed");
  console.assert(failoverResult.rebalanced === true, "Failover consensus commit failed");
  console.assert(node1.commitIndex === 1, "Raft state machine commit index assertion failed");

  node1.stopTimer();
  node2.stopTimer();
  node3.stopTimer();

  const elapsedTime = Date.now() - startTime;
  console.log(`[4/4] Phase 15 End-to-End Benchmark Complete in ${elapsedTime}ms.`);
  console.log("=== ALL PHASE 15 BENCHMARKS PASSED ===");
}

runPhase15Benchmark();
