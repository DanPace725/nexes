/**
 * TypeScript types for ORMD (Organizational Relational Markdown) format
 * Based on the specification in docs/04_data_artifact_specification.ormd
 */

export interface ORMDAuthor {
  id: string;
  display: string;
}

export interface ORMDDates {
  created: string; // ISO-8601 timestamp
  modified?: string; // ISO-8601 timestamp
}

export type LinkRelationship = 
  // Structural relationships
  | 'extends' | 'implements' | 'derives_from' | 'supersedes'
  // Logical relationships  
  | 'supports' | 'contradicts' | 'complements' | 'contextualizes'
  // Temporal relationships
  | 'precedes' | 'follows' | 'concurrent' | 'cyclical'
  // Custom relationships
  | string;

export interface ORMDLink {
  id: string;
  rel: LinkRelationship;
  to: string; // Path to related document
}

export type ConfidenceLevel = 'exploratory' | 'working' | 'validated';
export type EvidenceStrength = 'weak' | 'moderate' | 'strong';

export interface ORMDLineage {
  source: string;
  parent_docs?: string[];
  derivation_method?: 'synthesis' | 'extraction' | 'translation' | 'evolution';
  confidence_inheritance?: 'preserved' | 'degraded' | 'enhanced';
}

export interface ORMDResolution {
  confidence: ConfidenceLevel;
  evidence_strength?: EvidenceStrength;
  uncertainty_sources?: string[];
  validation_methods?: string[];
}

export interface ORMDTemporal {
  compression_ratio?: number;
  natural_timescale?: string;
  imposed_timescale?: string;
  stability_window?: string;
}

export interface ORMDContext {
  lineage?: ORMDLineage;
  resolution?: ORMDResolution;
  temporal?: ORMDTemporal;
}

export type DocumentStatus = 'draft' | 'active' | 'archived' | 'deprecated';

export interface ORMDFrontmatter {
  title: string;
  authors?: ORMDAuthor[];
  dates: ORMDDates;
  links?: ORMDLink[];
  context?: ORMDContext;
  version?: string;
  status?: DocumentStatus;
  description?: string;
}

export interface ORMDDocument {
  frontmatter: ORMDFrontmatter;
  content: string; // Markdown content after frontmatter
  raw: string; // Original document text
}

// ContextBundle types (JSON format)
export interface ContextBundleContent {
  type: string; // MIME type like 'text/markdown', 'text/plain'
  data: string;
  encoding?: string;
}

export interface ContextBundleFrame {
  type: string;
  perspective?: string;
  domain?: string;
  scope?: 'local' | 'global' | 'federated';
}

export interface ContextBundleLineage {
  source_type: string;
  source_id: string;
  parent_bundles?: string[];
  derivation: 'synthesis' | 'extraction' | 'translation' | 'evolution';
  confidence_flow: 'preserved' | 'degraded' | 'enhanced';
}

export interface ContextBundlePolicy {
  access_level: 'public' | 'private' | 'restricted';
  usage_rights?: string;
  retention_period?: string;
  privacy_constraints?: string[];
}

export interface ContextBundleUncertaintyBounds {
  temporal?: string;
  domain?: string;
  precision?: string;
}

export interface ContextBundleResolution {
  confidence: ConfidenceLevel;
  evidence_strength?: EvidenceStrength;
  uncertainty_bounds?: ContextBundleUncertaintyBounds;
  validation_status?: string;
}

export interface ContextBundleEvidenceSummary {
  support_count?: number;
  contradiction_count?: number;
  uncertainty_factors?: string[];
}

export interface ContextBundleExplain {
  reasoning_trace?: string[];
  evidence_summary?: ContextBundleEvidenceSummary;
  methodology?: string;
}

export interface ContextBundle {
  id: string; // URN format: urn:cb:ulid
  version: string;
  created?: string; // ISO-8601 timestamp
  content: ContextBundleContent;
  frame: ContextBundleFrame;
  lineage?: ContextBundleLineage;
  policy?: ContextBundlePolicy;
  resolution: ContextBundleResolution;
  explain?: ContextBundleExplain;
}

// Parser result types
export interface ParseResult<T> {
  success: boolean;
  data?: T;
  errors?: string[];
  warnings?: string[];
}

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
}
