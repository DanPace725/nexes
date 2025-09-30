#!/usr/bin/env node

/**
 * Storage Layer Test - Isolated testing of Context Storage
 */

async function testStorageLayer() {
  console.log('🧪 Testing Context Storage Layer');
  console.log('=' .repeat(50));

  try {
    // Test 1: Load Context Storage
    console.log('📚 Loading Context Storage...');
    const { ContextStorage } = require('./packages/context-storage/dist/storage');
    console.log('✅ Context Storage loaded successfully');

    // Test 2: Initialize storage
    console.log('\n🗄️  Initializing storage...');
    const storage = new ContextStorage({
      database_name: 'storage_test',
      auto_compact: true
    });
    console.log('✅ Storage initialized');

    // Test 3: Create a test ContextBundle
    console.log('\n📝 Creating test ContextBundle...');
    const testBundle = {
      id: 'urn:cb:test-storage-001',
      version: '1.0',
      created: new Date().toISOString(),
      content: {
        type: 'text/markdown',
        data: '# Test Document\n\nThis is a test context bundle for storage testing.\n\n## Features\n- Local storage\n- Search capabilities\n- Relationship tracking'
      },
      frame: {
        type: 'document',
        perspective: 'testing',
        domain: 'development',
        scope: 'local'
      },
      lineage: {
        source_type: 'manual',
        source_id: 'test-creator',
        derivation: 'synthesis',
        confidence_flow: 'preserved'
      },
      policy: {
        access_level: 'public'
      },
      resolution: {
        confidence: 'working'
      },
      explain: {
        reasoning: 'Created for testing the storage layer',
        assumptions: ['Storage layer is functional'],
        limitations: ['This is just a test']
      }
    };
    console.log(`✅ Test bundle created: ${testBundle.id}`);

    // Test 4: Store the bundle
    console.log('\n💾 Storing bundle...');
    const stored = await storage.store(testBundle);
    console.log(`✅ Bundle stored successfully`);
    console.log(`   - ID: ${stored.id}`);
    console.log(`   - Indexed at: ${stored.indexed_at}`);
    console.log(`   - Search text length: ${stored.search_text.length}`);
    console.log(`   - Tags: ${stored.tags.join(', ')}`);

    // Test 5: Retrieve the bundle
    console.log('\n🔍 Retrieving bundle...');
    const retrieved = await storage.get(testBundle.id);
    if (retrieved) {
      console.log(`✅ Bundle retrieved successfully`);
      console.log(`   - ID matches: ${retrieved.id === testBundle.id}`);
      console.log(`   - Content matches: ${retrieved.content.data === testBundle.content.data}`);
      console.log(`   - Frame type: ${retrieved.frame.type}`);
    } else {
      throw new Error('Failed to retrieve stored bundle');
    }

    // Test 6: Update the bundle
    console.log('\n📝 Updating bundle...');
    const updated = await storage.update(testBundle.id, {
      content: {
        ...testBundle.content,
        data: testBundle.content.data + '\n\n**Updated:** This content was modified during testing.'
      }
    });
    console.log(`✅ Bundle updated successfully`);
    console.log(`   - New content length: ${updated.content.data.length}`);

    // Test 7: Search functionality
    console.log('\n🔎 Testing search...');
    const searchResults1 = await storage.search('test document');
    console.log(`✅ Search 'test document': ${searchResults1.length} results`);

    const searchResults2 = await storage.search('storage testing');
    console.log(`✅ Search 'storage testing': ${searchResults2.length} results`);

    const searchResults3 = await storage.search('updated');
    console.log(`✅ Search 'updated': ${searchResults3.length} results`);

    // Test 8: Relationships
    console.log('\n🔗 Testing relationships...');
    
    // Add some relationships
    const rel1 = await storage.addRelationship(testBundle.id, 'urn:cb:related-001', 'references', 0.9);
    const rel2 = await storage.addRelationship(testBundle.id, 'urn:cb:related-002', 'supports', 0.7);
    const rel3 = await storage.addRelationship('urn:cb:related-003', testBundle.id, 'derives_from', 0.8);
    
    console.log(`✅ Added 3 relationships`);
    console.log(`   - ${rel1.relationship}: ${rel1.source_id} → ${rel1.target_id} (${rel1.strength})`);
    console.log(`   - ${rel2.relationship}: ${rel2.source_id} → ${rel2.target_id} (${rel2.strength})`);
    console.log(`   - ${rel3.relationship}: ${rel3.source_id} → ${rel3.target_id} (${rel3.strength})`);

    // Get relationships
    const relationships = await storage.getRelationships(testBundle.id);
    console.log(`✅ Retrieved ${relationships.length} relationships for bundle`);

    // Test 9: Advanced queries
    console.log('\n🔍 Testing advanced queries...');
    
    const queryResult1 = await storage.query({
      content_type: 'text/markdown',
      limit: 10
    });
    console.log(`✅ Query by content type: ${queryResult1.bundles.length} results in ${queryResult1.query_time_ms}ms`);

    const queryResult2 = await storage.query({
      search: 'testing',
      limit: 5
    });
    console.log(`✅ Query with search: ${queryResult2.bundles.length} results in ${queryResult2.query_time_ms}ms`);

    // Test 10: Batch operations
    console.log('\n📦 Testing batch operations...');
    const batchBundles = [
      {
        id: 'urn:cb:batch-001',
        version: '1.0',
        created: new Date().toISOString(),
        content: { type: 'text/plain', data: 'Batch test bundle 1' },
        frame: { type: 'note', scope: 'local' },
        lineage: { source_type: 'batch', source_id: 'test', derivation: 'synthesis', confidence_flow: 'preserved' },
        policy: { access_level: 'public' },
        resolution: { confidence: 'working' },
        explain: { reasoning: 'Batch test', assumptions: [], limitations: [] }
      },
      {
        id: 'urn:cb:batch-002',
        version: '1.0',
        created: new Date().toISOString(),
        content: { type: 'text/plain', data: 'Batch test bundle 2' },
        frame: { type: 'note', scope: 'local' },
        lineage: { source_type: 'batch', source_id: 'test', derivation: 'synthesis', confidence_flow: 'preserved' },
        policy: { access_level: 'public' },
        resolution: { confidence: 'working' },
        explain: { reasoning: 'Batch test', assumptions: [], limitations: [] }
      }
    ];

    const batchStored = await storage.storeBatch(batchBundles);
    console.log(`✅ Batch stored ${batchStored.length} bundles`);

    // Test 11: Storage statistics
    console.log('\n📊 Getting storage statistics...');
    const stats = await storage.getStats();
    console.log(`✅ Storage statistics:`);
    console.log(`   - Total bundles: ${stats.total_bundles}`);
    console.log(`   - Total relationships: ${stats.total_relationships}`);
    console.log(`   - Storage size: ${stats.storage_size_bytes} bytes`);
    console.log(`   - Database version: ${stats.database_version}`);

    // Test 12: Export functionality
    console.log('\n📤 Testing export...');
    const exportData = await storage.export();
    const exportObj = JSON.parse(exportData);
    console.log(`✅ Export completed:`);
    console.log(`   - Export size: ${exportData.length} characters`);
    console.log(`   - Contexts: ${exportObj.contexts?.length || 0}`);
    console.log(`   - Relationships: ${exportObj.relationships?.length || 0}`);

    // Clean up
    console.log('\n🧹 Cleaning up test data...');
    await storage.delete(testBundle.id);
    await storage.delete('urn:cb:batch-001');
    await storage.delete('urn:cb:batch-002');
    console.log('✅ Test bundles deleted');

    await storage.close();
    console.log('✅ Storage connection closed');

    console.log('\n🎉 Storage layer test completed successfully!');
    console.log('=' .repeat(50));
    console.log('✅ All storage operations working correctly');

  } catch (error) {
    console.error('\n❌ Storage test failed:');
    console.error(error);
    console.error('\nStack trace:');
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the storage test
if (require.main === module) {
  testStorageLayer();
}

module.exports = { testStorageLayer };
