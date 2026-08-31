/**
 * Phase 23 Stage 1 Unit Test: VectorIndexManager
 */
const assert = require('assert');
const VectorIndexManager = require('../../src/vectors/VectorIndexManager');

async function runStage1Tests() {
  console.log("Running Phase 23 Stage 1 Unit Tests: VectorIndexManager...");

  const manager = new VectorIndexManager('Part_0', 'cosine');

  // 1. Test Upsert
  manager.upsert('vec1', [1.0, 0.0, 0.0], { category: 'A' });
  manager.upsert('vec2', [0.0, 1.0, 0.0], { category: 'B' });
  manager.upsert('vec3', [0.7071, 0.7071, 0.0], { category: 'A' });

  // 2. Test Search (Cosine Similarity)
  const results = manager.search([1.0, 0.0, 0.0], 2);
  assert.strictEqual(results.length, 2);
  assert.strictEqual(results[0].id, 'vec1');
  assert.strictEqual(results[0].score.toFixed(4), '1.0000');
  assert.strictEqual(results[1].id, 'vec3');
  console.log("✓ Cosine similarity search verified.");

  // 3. Test Metadata Filter
  const filtered = manager.search([1.0, 0.0, 0.0], 10, { category: 'B' });
  assert.strictEqual(filtered.length, 1);
  assert.strictEqual(filtered[0].id, 'vec2');
  console.log("✓ Metadata filtering verified.");

  // 4. Test Deletion
  const delRes = manager.delete('vec1');
  assert.strictEqual(delRes.status, 'DELETED');
  const postDelResults = manager.search([1.0, 0.0, 0.0], 2);
  assert.strictEqual(postDelResults[0].id, 'vec3');
  console.log("✓ Vector deletion verified.");

  console.log("Stage 1 Unit Tests passed successfully.");
}

runStage1Tests().catch(err => {
  console.error("Stage 1 Test Failure:", err);
  process.exit(1);
});
