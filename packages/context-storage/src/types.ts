/**
 * Types for Context Storage Layer
 * Extends ORMD types with storage-specific functionality
 */

import { ContextBundle, ORMDLink } from '@nexes/ormd-parser';

export interface StoredContextBundle extends ContextBundle {
  /** Storage metadata */
  _id?: string;
  _rev?: string;
  
  /** Indexing fields */
  indexed_at: string; // ISO timestamp
  search_text: string; // Searchable content
  tags: string[]; // Extracted tags for filtering
}

export interface RelationshipIndex {
  id: string;
  source_id: string;
  target_id: string;
  relationship: string;
  strength: number; // 0-1 confidence score
  created_at: string;
  metadata?: Record<string, any>;
}

export interface ContextQuery {
  /** Text search */
  search?: string;
  
  /** Filter by tags */
  tags?: string[];
  
  /** Filter by content type */
  content_type?: string;
  
  /** Filter by confidence level */
  confidence?: 'exploratory' | 'working' | 'validated';
  
  /** Date range */
  created_after?: string;
  created_before?: string;
  
  /** Relationship queries */
  related_to?: string; // Find items related to this ID
  relationship_type?: string; // Filter by relationship type
  
  /** Pagination */
  limit?: number;
  skip?: number;
  
  /** Sorting */
  sort_by?: 'created' | 'modified' | 'relevance';
  sort_order?: 'asc' | 'desc';
}

export interface ContextQueryResult {
  bundles: StoredContextBundle[];
  total_count: number;
  relationships: RelationshipIndex[];
  query_time_ms: number;
}

export interface StorageStats {
  total_bundles: number;
  total_relationships: number;
  storage_size_bytes: number;
  last_sync: string;
  database_version: string;
}

export interface StorageConfig {
  database_name: string;
  auto_compact: boolean;
  sync_url?: string; // For remote sync
  encryption_key?: string; // For encrypted storage
}

export interface ContextStorageInterface {
  // Core CRUD operations
  store(bundle: ContextBundle): Promise<StoredContextBundle>;
  get(id: string): Promise<StoredContextBundle | null>;
  update(id: string, bundle: Partial<ContextBundle>): Promise<StoredContextBundle>;
  delete(id: string): Promise<boolean>;
  
  // Bulk operations
  storeBatch(bundles: ContextBundle[]): Promise<StoredContextBundle[]>;
  
  // Query operations
  query(query: ContextQuery): Promise<ContextQueryResult>;
  search(text: string, limit?: number): Promise<StoredContextBundle[]>;
  
  // Relationship operations
  addRelationship(source: string, target: string, relationship: string, strength?: number): Promise<RelationshipIndex>;
  getRelationships(id: string): Promise<RelationshipIndex[]>;
  findRelated(id: string, relationship?: string): Promise<StoredContextBundle[]>;
  
  // Maintenance operations
  compact(): Promise<void>;
  getStats(): Promise<StorageStats>;
  export(): Promise<string>; // Export as JSON
  import(data: string): Promise<number>; // Returns count of imported items
  
  // Lifecycle
  close(): Promise<void>;
}
