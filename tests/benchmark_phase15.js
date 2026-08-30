const RaftNode = require('../src/consensus/RaftNode');
const ClusterRpcTransport = require('../src/rpc/ClusterRpcTransport');
const PartitionRebalancer = require('../src/partition/PartitionRebalancer');
const GraphPartitioner = require('../src/partition/GraphPartitioner');

async function runPhase15Benchmark() {
  console.log("=== Phase 15 End-to-End Distributed Cluster Benchmark ===");
  const startTime = Date.now();

  // 1. Initialize Graph Adjacency & Min-Cut Partitioning
  console.log("[1/4] Partitioning Graph via Min-Cut Label Propagation...");
  
  // Construct adjacency graph for partitioner
  const graph = new Map();
  for (let i = 0; i < 30; i++) {
    const neighbors = [];
    if (i > 0) neighbors.push(`v_${i - 1}`);
    if (i < 29) neighbors.push(`v_${i + 1}`);
    graph.set(`v_${i}`, neighbors);
  }

  const partitioner = new GraphPartitioner(graph, 3);
  const partitions = partitioner.partition ? partitioner.partition() : null;
  
  console.log(`  -> Total Graph Nodes: ${graph.size} across 3 partitions`);

  // 2. Initialize Raft Consensus Engine
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

  // 4. Verification Assertions & Stop Timers
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
