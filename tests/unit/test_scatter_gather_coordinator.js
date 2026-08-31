/**
 * Phase 23 Stage 2 Unit Test: ScatterGatherCoordinator
 */
const assert = require('assert');
const VectorIndexManager = require('../../src/vectors/VectorIndexManager');
const ScatterGatherCoordinator = require('../../src/vectors/ScatterGatherCoordinator');

async function runStage2Tests() {
  console.log("Running Phase 23 Stage 2 Unit Tests: ScatterGatherCoordinator...");

  // 1. Setup Partition 0 and Partition 1
  const p0 = new VectorIndexManager('Part_0', 'cosine');
  const p1 = new VectorIndexManager('Part_1', 'cosine');

  p0.upsert('p0_v1', [1.0, 0.0, 0.0], { tag: 'env' });  // Sim score: 1.0
  p0.upsert('p0_v2', [0.5, 0.5, 0.0], { tag: 'env' });  // Sim score: 0.7071

  p1.upsert('p1_v1', [0.9, 0.1, 0.0], { tag: 'env' });  // Sim score: 0.9938
  p1.upsert('p1_v2', [0.0, 1.0, 0.0], { tag: 'prod' }); // Sim score: 0.0

  const coordinator = new ScatterGatherCoordinator([p0, p1]);

  // 2. Test Global Top-2 Search
  const results = await coordinator.executeSearch([1.0, 0.0, 0.0], 2);
  assert.strictEqual(results.length, 2);
  assert.strictEqual(results[0].id, 'p0_v1');
  assert.strictEqual(results[0].partitionId, 'Part_0');
  assert.strictEqual(results[1].id, 'p1_v1');
  assert.strictEqual(results[1].partitionId, 'Part_1');
  console.log("✓ Global multi-partition Top-K ranking verified.");

  // 3. Test Filtered Scatter-Gather
  const filtered = await coordinator.executeSearch([1.0, 0.0, 0.0], 10, { tag: 'prod' });
  assert.strictEqual(filtered.length, 1);
  assert.strictEqual(filtered[0].id, 'p1_v2');
  console.log("✓ Distributed metadata filtering verified.");

  // 4. Test Node Fault Resilience (Partial partition failure handled gracefully)
  const faultyNode = {
    partitionId: 'Part_Faulty',
    metric: 'cosine',
    search: async () => { throw new Error('Simulated network drop'); }
  };
  coordinator.registerPartition(faultyNode);

  const resilientRes = await coordinator.executeSearch([1.0, 0.0, 0.0], 2);
  assert.strictEqual(resilientRes.length, 2);
  console.log("✓ Fault resilience under partial partition failure verified.");

  console.log("Stage 2 Unit Tests passed successfully.");
}

runStage2Tests().catch(err => {
  console.error("Stage 2 Test Failure:", err);
  process.exit(1);
});
