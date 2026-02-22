/**
 * Test Connection Manager
 * Quick test to verify connection manager and consolidation engine
 */

import { MemoryConnectionManager } from './connection-manager';
import { ConsolidationEngine } from './consolidation-engine';

async function testConnectionManager() {
  console.log('=== Testing Memory Connection Manager ===\n');

  const manager = MemoryConnectionManager.getInstance();

  console.log('1. Initializing...');
  await manager.initialize();

  console.log(`2. Qdrant connected: ${manager.isQdrantConnected()}`);

  const memory = manager.getMemory();
  console.log(`3. Memory stats:`, memory.getStats());

  console.log('\n4. Testing short-term storage...');
  await memory.store('test-key-1', 'Test content 1', 'short-term', { importance: 0.5, type: 'note' });
  await memory.store('test-key-2', 'Important pattern', 'short-term', { importance: 0.8, type: 'code-pattern' });
  await memory.store('test-key-3', 'Critical decision', 'short-term', { importance: 0.9, type: 'decision' });

  console.log(`5. Short-term entries: ${memory.getShortTermEntries().length}`);

  console.log('\n6. Testing consolidation engine...');
  const rules = [
    {
      name: 'important-to-longterm',
      condition: "importance >= 0.7 AND layer == 'short-term'",
      action: 'promote to long-term',
    },
    {
      name: 'code-pattern-save',
      condition: "type == 'code-pattern' AND layer == 'short-term'",
      action: "promote to long-term with tags['code', 'pattern']",
    },
    {
      name: 'decision-log',
      condition: "type == 'decision'",
      action: 'log to episodic',
    },
  ];

  const engine = new ConsolidationEngine(memory, rules);

  if (manager.isQdrantConnected()) {
    const result = await engine.runConsolidation();
    console.log('7. Consolidation result:', result);
  } else {
    console.log('7. Skipping consolidation (Qdrant not available)');
  }

  console.log('\n8. Final stats:', memory.getStats());

  console.log('\n9. Shutting down...');
  await manager.shutdown();

  console.log('\n✅ Test complete!');
}

testConnectionManager().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
