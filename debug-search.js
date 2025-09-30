#!/usr/bin/env node

/**
 * Debug Search Issues
 */

async function debugSearch() {
  console.log('🔍 Debugging Search Issues');
  console.log('=' .repeat(40));

  try {
    const { ContextStorage } = require('./packages/context-storage/dist/storage');
    
    const storage = new ContextStorage({
      database_name: 'debug_search',
      auto_compact: true
    });

    // Create a test bundle
    const testBundle = {
      id: 'urn:cb:debug-search-001',
      version: '1.0',
      created: new Date().toISOString(),
      content: {
        type: 'text/markdown',
        data: '# Test Document\n\nThis is a test for search functionality.'
      },
      frame: {
        type: 'document',
        perspective: 'testing',
        domain: 'development',
        scope: 'local'
      },
      lineage: {
        source_type: 'manual',
        source_id: 'test',
        derivation: 'synthesis',
        confidence_flow: 'preserved'
      },
      policy: { access_level: 'public' },
      resolution: { confidence: 'working' },
      explain: { reasoning: 'Debug test', assumptions: [], limitations: [] }
    };

    console.log('💾 Storing test bundle...');
    const stored = await storage.store(testBundle);
    
    console.log('🔍 Examining stored bundle:');
    console.log(`   - Search text: "${stored.search_text}"`);
    console.log(`   - Search text length: ${stored.search_text.length}`);
    console.log(`   - Tags: [${stored.tags.join(', ')}]`);

    // Test direct database query to see what's actually stored
    console.log('\n📊 Testing search queries...');
    
    // Try different search terms
    const searches = ['test', 'document', 'search', 'functionality', 'testing'];
    
    for (const term of searches) {
      const results = await storage.search(term);
      console.log(`   - Search "${term}": ${results.length} results`);
    }

    // Try a manual database query to see what's happening
    console.log('\n🔧 Manual database inspection...');
    const allBundles = await storage.query({ limit: 10 });
    console.log(`   - Total bundles in DB: ${allBundles.bundles.length}`);
    
    if (allBundles.bundles.length > 0) {
      const bundle = allBundles.bundles[0];
      console.log(`   - First bundle search_text: "${bundle.search_text}"`);
      console.log(`   - First bundle content: "${bundle.content.data.substring(0, 100)}..."`);
    }

    // Clean up
    await storage.delete(testBundle.id);
    await storage.close();

  } catch (error) {
    console.error('❌ Debug failed:', error);
    console.error(error.stack);
  }
}

debugSearch();
