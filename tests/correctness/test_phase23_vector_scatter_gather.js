/**
 * Phase 23 Stage 4: End-to-End Vector Scatter-Gather & Hybrid Search Correctness Suite
 */
const assert = require('assert');
const VectorIndexManager = require('../../src/vectors/VectorIndexManager');
const ScatterGatherCoordinator = require('../../src/vectors/ScatterGatherCoordinator');
const FilteredVectorSearch = require('../../src/vectors/FilteredVectorSearch');

async function runStage4Correctness() {
  console.log("Running Phase 23 Stage 4: End-to-End Vector Scatter-Gather Correctness Suite...");

  // 1. Initialize Cluster Partitions
  const p0 = new VectorIndexManager('Part_0', 'cosine');
  const p1 = new VectorIndexManager('Part_1', 'cosine');
  const p2 = new VectorIndexManager('Part_2', 'cosine');

  // 2. Populate Partitions with High-Dimensional Vectors & Metadata
  p0.upsert('item_001', [0.95, 0.05, 0.0], { tenant: 'org_A', price: 120, tags: ['ai', 'gpu'] });
  p0.upsert('item_002', [0.10, 0.90, 0.0], { tenant: 'org_B', price: 45, tags: ['cpu'] });

  p1.upsert('item_101', [0.92, 0.08, 0.0], { tenant: 'org_A', price: 300, tags: ['gpu', 'cluster'] });
  p1.upsert('item_102', [0.40, 0.60, 0.0], { tenant: 'org_A', price: 80, tags: ['storage'] });

  p2.upsert('item_201', [0.88, 0.12, 0.0], { tenant: 'org_A', price: 150, tags: ['gpu'] });
  p2.upsert('item_202', [0.00, 1.00, 0.0], { tenant: 'org_C', price: 10, tags: ['legacy'] });

  // 3. Test Distributed Scatter-Gather Across All Partitions
  const coordinator = new ScatterGatherCoordinator([p0, p1, p2]);
  const queryVector = [1.0, 0.0, 0.0];

  const globalTop3 = await coordinator.executeSearch(queryVector, 3);
  assert.strictEqual(globalTop3.length, 3);
  assert.strictEqual(globalTop3[0].id, 'item_001', 'Rank 1 across cluster');
  assert.strictEqual(globalTop3[1].id, 'item_101', 'Rank 2 across cluster');
  assert.strictEqual(globalTop3[2].id, 'item_201', 'Rank 3 across cluster');
  console.log("✓ Test 1 Passed: Global k-NN scatter-gather aggregation correct across partitions.");

  // 4. Test Hybrid Filtered Search Across Partition 0 & 1
  const searchEngineP0 = new FilteredVectorSearch(p0);
  const searchEngineP1 = new FilteredVectorSearch(p1);

  const resP0 = searchEngineP0.searchWithPredicate(queryVector, { tenant: 'org_A', price: { $gt: 100 } });
  const resP1 = searchEngineP1.searchWithPredicate(queryVector, { tenant: 'org_A', price: { $gt: 100 } });

  const aggregatedFiltered = [...resP0, ...resP1].sort((a, b) => b.score - a.score);
  assert.strictEqual(aggregatedFiltered.length, 2);
  assert.strictEqual(aggregatedFiltered[0].id, 'item_001');
  assert.strictEqual(aggregatedFiltered[1].id, 'item_101');
  console.log("✓ Test 2 Passed: Distributed hybrid metadata predicate search verified.");

  // 5. Test Partial Node Failure Resilience in Distributed Scatter-Gather
  const faultyPartition = {
    partitionId: 'Part_Timeout',
    metric: 'cosine',
    search: async () => { throw new Error('RPC Timeout'); }
  };
  coordinator.registerPartition(faultyPartition);

  const resilientResults = await coordinator.executeSearch(queryVector, 2);
  assert.strictEqual(resilientResults.length, 2);
  assert.strictEqual(resilientResults[0].id, 'item_001');
  console.log("✓ Test 3 Passed: Scatter-Gather survived partition RPC failure gracefully.");

  console.log("Phase 23 Stage 4 Suite execution complete: All tests passed successfully.");
}

runStage4Correctness().catch(err => {
  console.error("Stage 4 Correctness Failure:", err);
  process.exit(1);
});
