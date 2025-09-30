/**
 * Simple test for Context Storage
 */

const { ContextStorage } = require('./dist/storage');

async function testStorage() {
  console.log('🧪 Testing Context Storage...');
  
  // Initialize storage
  const storage = new ContextStorage({
    database_name: 'test_nexes',
    auto_compact: true
  });

  try {
    // Create a test ContextBundle
    const testBundle = {
      id: 'urn:cb:test-001',
      version: '1.0',
      created: new Date().toISOString(),
      content: {
        type: 'text/markdown',
        data: '# Test Document\n\nThis is a test context bundle for storage testing.'
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

    console.log('📝 Storing test bundle...');
    const stored = await storage.store(testBundle);
    console.log(`✅ Stored bundle with ID: ${stored.id}`);

    console.log('🔍 Retrieving bundle...');
    const retrieved = await storage.get(testBundle.id);
    console.log(`✅ Retrieved bundle: ${retrieved?.id}`);

    console.log('🔎 Testing search...');
    const searchResults = await storage.search('test document');
    console.log(`✅ Search found ${searchResults.length} results`);

    console.log('📊 Getting storage stats...');
    const stats = await storage.getStats();
    console.log(`✅ Storage stats: ${stats.total_bundles} bundles, ${stats.total_relationships} relationships`);

    console.log('🔗 Testing relationships...');
    const relationship = await storage.addRelationship(
      testBundle.id,
      'urn:cb:related-001',
      'references',
      0.8
    );
    console.log(`✅ Added relationship: ${relationship.id}`);

    const relationships = await storage.getRelationships(testBundle.id);
    console.log(`✅ Found ${relationships.length} relationships`);

    console.log('🧹 Cleaning up...');
    await storage.delete(testBundle.id);
    console.log('✅ Test bundle deleted');

    await storage.close();
    console.log('✅ Storage closed');

    console.log('🎉 All tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    await storage.close();
    process.exit(1);
  }
}

// Run the test
testStorage();