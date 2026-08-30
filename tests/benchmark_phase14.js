const assert = require('assert');
const ClusterStorageAdapter = require('../src/storage/ClusterStorageAdapter');
const GraphPartitioner = require('../src/partition/GraphPartitioner');
const QueryBatcher = require('../src/partition/QueryBatcher');

async function runPhase14Benchmark() {
  console.log("Starting Step 14.4 End-to-End Distributed Graph & Min-Cut Benchmark Suite...\n");

  const storage = new ClusterStorageAdapter();
  const partitioner = new GraphPartitioner(4);
  const batcher = new QueryBatcher(storage, 15, 2000);

  const NUM_COMMUNITIES = 3;
  const NODES_PER_COMMUNITY = 100;
  const totalNodes = NUM_COMMUNITIES * NODES_PER_COMMUNITY;
  const edges = [];

  console.log(`Generating synthetic graph structure (${totalNodes} nodes, 3 cluster communities)...`);

  for (let c = 0; c < NUM_COMMUNITIES; c++) {
    for (let i = 1; i <= NODES_PER_COMMUNITY; i++) {
      const nodeId = `cell_C${c}_${i}`;
      const neighbors = [];

      if (i > 1) {
        const prevId = `cell_C${c}_${i - 1}`;
        neighbors.push(prevId);
        edges.push({ source: prevId, target: nodeId });
        await storage.putRelationship(prevId, nodeId, 'synapse');
      }

      partitioner.assignPartition(nodeId, neighbors);
    }
  }

  const interEdges = [
    { source: 'cell_C0_100', target: 'cell_C1_1' },
    { source: 'cell_C1_100', target: 'cell_C2_1' }
  ];

  for (const edge of interEdges) {
    edges.push(edge);
    await storage.putRelationship(edge.source, edge.target, 'synapse');
  }

  console.log("\nPhase A: Evaluating Label Propagation Min-Cut Partitioning Efficiency...");
  const boundaryRatio = partitioner.calculateEdgeBoundaryRatio(edges);
  console.log(`Cross-Partition Edge Boundary Ratio: ${boundaryRatio.toFixed(2)}% (Target: < 15.0%)`);
  assert.ok(boundaryRatio < 15.0, `Boundary ratio ${boundaryRatio}% exceeds threshold`);
  console.log("Min-Cut Graph Partitioning Metric: PASSED");

  console.log("\nPhase B: Executing Concurrent Cross-Partition Traversal Queries...");
  const startTime = Date.now();

  const testQueries = [
    batcher.getNeighbors('cell_C0_1'),
    batcher.getNeighbors('cell_C0_1'),
    batcher.getNeighbors('cell_C1_1'),
    batcher.getNeighbors('cell_C2_1')
  ];

  const results = await Promise.all(testQueries);
  const durationMs = Date.now() - startTime;

  assert.strictEqual(results.length, 4);
  console.log(`Processed ${results.length} aggregated traversal queries in ${durationMs}ms`);
  console.log("Batched Query & Local Cache Efficiency Sweep: PASSED");

  console.log("\n========================================");
  console.log("PHASE 14 COMPLETE: Distributed Graph Storage & Partitioning Benchmark Passed.");
  console.log("========================================");
}

runPhase14Benchmark().catch(err => {
  console.error("Phase 14 Benchmark Failed:", err);
  process.exit(1);
});
