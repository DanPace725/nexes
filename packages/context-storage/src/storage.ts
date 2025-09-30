/**
 * PouchDB-based Context Storage Implementation
 * Provides local-first storage with optional remote sync
 */

import PouchDB from 'pouchdb';
import PouchDBFind from 'pouchdb-find';
import { v4 as uuidv4 } from 'uuid';
import { ContextBundle } from '@nexes/ormd-parser';
import {
  StoredContextBundle,
  RelationshipIndex,
  ContextQuery,
  ContextQueryResult,
  StorageStats,
  StorageConfig,
  ContextStorageInterface
} from './types';

// Enable PouchDB plugins
PouchDB.plugin(PouchDBFind);

export class ContextStorage implements ContextStorageInterface {
  private db: PouchDB.Database<StoredContextBundle>;
  private relationshipsDb: PouchDB.Database<RelationshipIndex>;
  private config: StorageConfig;

  constructor(config: StorageConfig) {
    this.config = config;
    
    // Initialize main database
    this.db = new PouchDB<StoredContextBundle>(`${config.database_name}_contexts`);
    
    // Initialize relationships database
    this.relationshipsDb = new PouchDB<RelationshipIndex>(`${config.database_name}_relationships`);
    
    this.initializeIndexes();
  }

  private async initializeIndexes(): Promise<void> {
    // Create indexes for efficient querying
    await this.db.createIndex({
      index: {
        fields: ['search_text', 'tags', 'content.type', 'frame.confidence', 'created']
      }
    });

    await this.relationshipsDb.createIndex({
      index: {
        fields: ['source_id', 'target_id', 'relationship', 'strength']
      }
    });
  }

  async store(bundle: ContextBundle): Promise<StoredContextBundle> {
    const storedBundle: StoredContextBundle = {
      ...bundle,
      _id: bundle.id,
      indexed_at: new Date().toISOString(),
      search_text: this.extractSearchText(bundle),
      tags: this.extractTags(bundle)
    };

    try {
      const result = await this.db.put(storedBundle);
      storedBundle._rev = result.rev;
      return storedBundle;
    } catch (error) {
      throw new Error(`Failed to store context bundle: ${error}`);
    }
  }

  async get(id: string): Promise<StoredContextBundle | null> {
    try {
      const doc = await this.db.get(id);
      return doc;
    } catch (error: any) {
      if (error.status === 404) {
        return null;
      }
      throw new Error(`Failed to get context bundle: ${error}`);
    }
  }

  async update(id: string, updates: Partial<ContextBundle>): Promise<StoredContextBundle> {
    const existing = await this.get(id);
    if (!existing) {
      throw new Error(`Context bundle not found: ${id}`);
    }

    const updated: StoredContextBundle = {
      ...existing,
      ...updates,
      indexed_at: new Date().toISOString(),
      search_text: this.extractSearchText({ ...existing, ...updates } as ContextBundle),
      tags: this.extractTags({ ...existing, ...updates } as ContextBundle)
    };

    const result = await this.db.put(updated);
    updated._rev = result.rev;
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    try {
      const doc = await this.db.get(id);
      await this.db.remove(doc);
      
      // Also remove related relationships
      const relationships = await this.getRelationships(id);
      for (const rel of relationships) {
        const relDoc = await this.relationshipsDb.get(rel.id);
        await this.relationshipsDb.remove(relDoc);
      }
      
      return true;
    } catch (error: any) {
      if (error.status === 404) {
        return false;
      }
      throw new Error(`Failed to delete context bundle: ${error}`);
    }
  }

  async storeBatch(bundles: ContextBundle[]): Promise<StoredContextBundle[]> {
    const storedBundles = bundles.map(bundle => ({
      ...bundle,
      _id: bundle.id,
      indexed_at: new Date().toISOString(),
      search_text: this.extractSearchText(bundle),
      tags: this.extractTags(bundle)
    }));

    const results = await this.db.bulkDocs(storedBundles);
    
    // Update with revision numbers
    results.forEach((result, index) => {
      if ('rev' in result) {
        (storedBundles[index] as any)._rev = result.rev;
      }
    });

    return storedBundles;
  }

  async query(query: ContextQuery): Promise<ContextQueryResult> {
    const startTime = Date.now();
    
    // Build PouchDB selector
    const selector: any = {};
    
    // Note: PouchDB doesn't support regex, so we'll handle search separately
    
    if (query.tags && query.tags.length > 0) {
      selector.tags = { $in: query.tags };
    }
    
    if (query.content_type) {
      selector['content.type'] = query.content_type;
    }
    
    if (query.confidence) {
      selector['frame.confidence'] = query.confidence;
    }
    
    if (query.created_after || query.created_before) {
      selector.created = {};
      if (query.created_after) {
        selector.created.$gte = query.created_after;
      }
      if (query.created_before) {
        selector.created.$lte = query.created_before;
      }
    }

    // Execute query
    let results;
    
    if (Object.keys(selector).length === 0 && !query.search) {
      // No filters, get all docs
      const allDocs = await this.db.allDocs({ 
        include_docs: true,
        limit: query.limit || 50,
        skip: query.skip || 0
      });
      results = { docs: allDocs.rows.map(row => row.doc).filter(doc => doc) as StoredContextBundle[] };
    } else if (query.search && Object.keys(selector).length === 0) {
      // Only search filter, use our search method
      const searchResults = await this.search(query.search, query.limit || 50);
      results = { docs: searchResults.slice(query.skip || 0) };
    } else {
      // Use PouchDB find for non-search filters
      const findOptions: any = {
        selector,
        limit: query.limit || 50,
        skip: query.skip || 0
      };

      if (query.sort_by) {
        const sortField = query.sort_by === 'created' ? 'created' : 
                         query.sort_by === 'modified' ? 'indexed_at' : 'indexed_at';
        findOptions.sort = [{ [sortField]: query.sort_order === 'desc' ? 'desc' : 'asc' }];
      }

      results = await this.db.find(findOptions);
      
      // Apply search filter manually if needed
      if (query.search) {
        const searchTerm = query.search.toLowerCase();
        results.docs = results.docs.filter(doc => 
          doc.search_text && doc.search_text.toLowerCase().includes(searchTerm)
        );
      }
    }
    
    // Get relationships if needed
    let relationships: RelationshipIndex[] = [];
    if (query.related_to) {
      relationships = await this.getRelationships(query.related_to);
    }

    const queryTime = Date.now() - startTime;

    return {
      bundles: results.docs,
      total_count: results.docs.length, // Note: PouchDB doesn't provide total count easily
      relationships,
      query_time_ms: queryTime
    };
  }

  async search(text: string, limit: number = 20): Promise<StoredContextBundle[]> {
    // PouchDB doesn't support regex in selectors, so we'll get all docs and filter manually
    // For better performance in production, we'd want to use a proper search index
    const allDocs = await this.db.allDocs({ include_docs: true });
    
    const searchTerm = text.toLowerCase();
    const matches = allDocs.rows
      .map(row => row.doc)
      .filter(doc => doc && doc.search_text && doc.search_text.toLowerCase().includes(searchTerm))
      .slice(0, limit) as StoredContextBundle[];

    return matches;
  }

  async addRelationship(
    source: string, 
    target: string, 
    relationship: string, 
    strength: number = 1.0
  ): Promise<RelationshipIndex> {
    const rel: RelationshipIndex = {
      id: uuidv4(),
      source_id: source,
      target_id: target,
      relationship,
      strength,
      created_at: new Date().toISOString()
    };

    await this.relationshipsDb.put({ ...rel, _id: rel.id });
    return rel;
  }

  async getRelationships(id: string): Promise<RelationshipIndex[]> {
    const result = await this.relationshipsDb.find({
      selector: {
        $or: [
          { source_id: id },
          { target_id: id }
        ]
      }
    });

    return result.docs;
  }

  async findRelated(id: string, relationship?: string): Promise<StoredContextBundle[]> {
    const relationships = await this.getRelationships(id);
    
    const relatedIds = relationships
      .filter(rel => !relationship || rel.relationship === relationship)
      .map(rel => rel.source_id === id ? rel.target_id : rel.source_id);

    if (relatedIds.length === 0) {
      return [];
    }

    const result = await this.db.find({
      selector: {
        _id: { $in: relatedIds }
      }
    });

    return result.docs;
  }

  async compact(): Promise<void> {
    await this.db.compact();
    await this.relationshipsDb.compact();
  }

  async getStats(): Promise<StorageStats> {
    const [contextInfo, relationshipInfo] = await Promise.all([
      this.db.info(),
      this.relationshipsDb.info()
    ]);

    return {
      total_bundles: contextInfo.doc_count,
      total_relationships: relationshipInfo.doc_count,
      storage_size_bytes: (contextInfo as any).data_size || 0 + (relationshipInfo as any).data_size || 0,
      last_sync: new Date().toISOString(), // TODO: Track actual sync time
      database_version: '1.0.0'
    };
  }

  async export(): Promise<string> {
    const [contexts, relationships] = await Promise.all([
      this.db.allDocs({ include_docs: true }),
      this.relationshipsDb.allDocs({ include_docs: true })
    ]);

    const exportData = {
      version: '1.0.0',
      exported_at: new Date().toISOString(),
      contexts: contexts.rows.map(row => row.doc),
      relationships: relationships.rows.map(row => row.doc)
    };

    return JSON.stringify(exportData, null, 2);
  }

  async import(data: string): Promise<number> {
    const importData = JSON.parse(data);
    
    let importedCount = 0;
    
    if (importData.contexts) {
      await this.db.bulkDocs(importData.contexts);
      importedCount += importData.contexts.length;
    }
    
    if (importData.relationships) {
      await this.relationshipsDb.bulkDocs(importData.relationships);
    }

    return importedCount;
  }

  async close(): Promise<void> {
    await this.db.close();
    await this.relationshipsDb.close();
  }

  // Helper methods
  private extractSearchText(bundle: ContextBundle): string {
    const parts = [
      bundle.content.data,
      bundle.frame.type || '',
      bundle.frame.perspective || '',
      bundle.frame.domain || ''
    ];
    
    return parts.filter(Boolean).join(' ').toLowerCase();
  }

  private extractTags(bundle: ContextBundle): string[] {
    const tags = new Set<string>();
    
    // Add content type as tag
    tags.add(bundle.content.type);
    
    // Add frame type as tag
    tags.add(bundle.frame.type);
    
    // Add scope as tag
    if (bundle.frame.scope) {
      tags.add(`scope:${bundle.frame.scope}`);
    }
    
    // Add confidence level as tag
    if (bundle.resolution?.confidence) {
      tags.add(`confidence:${bundle.resolution.confidence}`);
    }
    
    // Add domain as tag
    if (bundle.frame.domain) {
      tags.add(`domain:${bundle.frame.domain}`);
    }

    return Array.from(tags);
  }
}
