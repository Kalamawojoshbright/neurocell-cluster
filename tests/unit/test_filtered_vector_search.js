/**
 * Phase 23 Stage 3 Unit Test: FilteredVectorSearch
 */
const assert = require('assert');
const VectorIndexManager = require('../../src/vectors/VectorIndexManager');
const FilteredVectorSearch = require('../../src/vectors/FilteredVectorSearch');

async function runStage3Tests() {
  console.log("Running Phase 23 Stage 3 Unit Tests: FilteredVectorSearch...");

  const manager = new VectorIndexManager('Part_0', 'cosine');
  const hybridSearch = new FilteredVectorSearch(manager);

  manager.upsert('doc1', [1.0, 0.0, 0.0], { category: 'tech', score: 85, status: 'active' });
  manager.upsert('doc2', [0.9, 0.1, 0.0], { category: 'tech', score: 40, status: 'active' });
  manager.upsert('doc3', [0.8, 0.2, 0.0], { category: 'finance', score: 95, status: 'archived' });

  // 1. Test Predicate Filter ($gt and $in)
  const results = hybridSearch.searchWithPredicate([1.0, 0.0, 0.0], {
    category: { $in: ['tech', 'finance'] },
    score: { $gt: 50 },
    status: 'active'
  }, 10);

  assert.strictEqual(results.length, 1);
  assert.strictEqual(results[0].id, 'doc1');
  console.log("✓ Hybrid predicate search ($gt, $in, $eq) verified.");

  // 2. Test Range Filtering ($lt)
  const rangeResults = hybridSearch.searchWithPredicate([1.0, 0.0, 0.0], {
    score: { $lt: 50 }
  }, 10);

  assert.strictEqual(rangeResults.length, 1);
  assert.strictEqual(rangeResults[0].id, 'doc2');
  console.log("✓ Range predicate filtering ($lt) verified.");

  console.log("Stage 3 Unit Tests passed successfully.");
}

runStage3Tests().catch(err => {
  console.error("Stage 3 Test Failure:", err);
  process.exit(1);
});
