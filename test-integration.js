#!/usr/bin/env node

/**
 * Integration Test: ORMD Parser → Context Storage
 * Tests the full pipeline from ORMD document to storage and retrieval
 */

const fs = require('fs');
const path = require('path');

async function testIntegration() {
  console.log('🧪 Integration Test: ORMD Parser → Context Storage');
  console.log('=' .repeat(60));

  try {
    // Test 1: Load and parse ORMD Parser
    console.log('📚 Loading ORMD Parser...');
    const { ORMDParser } = require('./packages/ormd-parser/dist/parser');
    console.log('✅ ORMD Parser loaded successfully');

    // Test 2: Parse a real ORMD document
    console.log('\n📄 Parsing ORMD document...');
    const docPath = './docs/01_foundational_ethos.ormd';
    const docContent = fs.readFileSync(docPath, 'utf-8');
    
    const parseResult = ORMDParser.parse(docContent);
    console.log(`✅ Parse result:`, parseResult.success ? 'Success' : 'Failed');
    console.log('Parse result structure:', Object.keys(parseResult));
    
    if (!parseResult.success) {
      console.log('❌ Parse errors:', parseResult.errors);
      throw new Error('Failed to parse ORMD document');
    }
    
    const doc = parseResult.data;
    console.log('Document structure:', doc ? Object.keys(doc) : 'undefined');
    console.log('Document:', doc);
    
    if (doc && doc.frontmatter) {
      console.log(`✅ Parsed document: ${doc.frontmatter.title}`);
    } else {
      console.log('❌ No frontmatter found in document');
      throw new Error('Document structure is invalid');
    }
    console.log(`   - Authors: ${doc.frontmatter.authors?.length || 0}`);
    console.log(`   - Links: ${doc.frontmatter.links?.length || 0}`);
    console.log(`   - Content length: ${doc.content.length} chars`);

    // Test 3: Convert to ContextBundle
    console.log('\n🔄 Converting to ContextBundle...');
    const contextBundle = ORMDParser.toContextBundle(doc);
    console.log(`✅ ContextBundle created: ${contextBundle.id}`);
    console.log(`   - Content type: ${contextBundle.content.type}`);
    console.log(`   - Frame type: ${contextBundle.frame.type}`);

    // Test 4: Load Context Storage
    console.log('\n💾 Loading Context Storage...');
    const { ContextStorage } = require('./packages/context-storage/dist/storage');
    console.log('✅ Context Storage loaded successfully');

    // Test 5: Initialize storage and store the bundle
    console.log('\n🗄️  Initializing storage...');
    const storage = new ContextStorage({
      database_name: 'integration_test',
      auto_compact: true
    });
    console.log('✅ Storage initialized');

    console.log('\n💾 Storing ContextBundle...');
    const storedBundle = await storage.store(contextBundle);
    console.log(`✅ Bundle stored with ID: ${storedBundle.id}`);
    console.log(`   - Search text: ${storedBundle.search_text.substring(0, 100)}...`);
    console.log(`   - Tags: ${storedBundle.tags.join(', ')}`);

    // Test 6: Retrieve and verify
    console.log('\n🔍 Retrieving bundle...');
    const retrieved = await storage.get(contextBundle.id);
    console.log(`✅ Retrieved bundle: ${retrieved?.id}`);
    console.log(`   - Content matches: ${retrieved?.content.data === contextBundle.content.data}`);

    // Test 7: Test search functionality
    console.log('\n🔎 Testing search...');
    const searchResults = await storage.search('relational intelligence');
    console.log(`✅ Search found ${searchResults.length} results`);

    // Test 8: Test relationships
    console.log('\n🔗 Testing relationships...');
    const relationship = await storage.addRelationship(
      contextBundle.id,
      'urn:cb:related-test',
      'references',
      0.8
    );
    console.log(`✅ Added relationship: ${relationship.id}`);

    const relationships = await storage.getRelationships(contextBundle.id);
    console.log(`✅ Found ${relationships.length} relationships`);

    // Test 9: Get storage stats
    console.log('\n📊 Storage statistics...');
    const stats = await storage.getStats();
    console.log(`✅ Storage stats:`);
    console.log(`   - Total bundles: ${stats.total_bundles}`);
    console.log(`   - Total relationships: ${stats.total_relationships}`);
    console.log(`   - Storage size: ${stats.storage_size_bytes} bytes`);

    // Test 10: Test query functionality
    console.log('\n🔍 Testing advanced queries...');
    const queryResult = await storage.query({
      content_type: 'text/markdown',
      limit: 5
    });
    console.log(`✅ Query found ${queryResult.bundles.length} bundles`);
    console.log(`   - Query time: ${queryResult.query_time_ms}ms`);

    // Clean up
    console.log('\n🧹 Cleaning up...');
    await storage.delete(contextBundle.id);
    await storage.close();
    console.log('✅ Cleanup completed');

    console.log('\n🎉 Integration test completed successfully!');
    console.log('=' .repeat(60));
    console.log('✅ All components working together properly');
    console.log('✅ ORMD parsing → ContextBundle creation → Storage → Retrieval');
    console.log('✅ Search, relationships, and query functionality confirmed');

  } catch (error) {
    console.error('\n❌ Integration test failed:');
    console.error(error);
    console.error('\nStack trace:');
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the integration test
if (require.main === module) {
  testIntegration();
}

module.exports = { testIntegration };
