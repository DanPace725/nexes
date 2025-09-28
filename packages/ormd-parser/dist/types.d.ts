/**
 * TypeScript types for ORMD (Organizational Relational Markdown) format
 * Based on the specification in docs/04_data_artifact_specification.ormd
 */
export interface ORMDAuthor {
    id: string;
    display: string;
}
export interface ORMDDates {
    created: string;
    modified?: string;
}
export type LinkRelationship = 'extends' | 'implements' | 'derives_from' | 'supersedes' | 'supports' | 'contradicts' | 'complements' | 'contextualizes' | 'precedes' | 'follows' | 'concurrent' | 'cyclical' | string;
export interface ORMDLink {
    id: string;
    rel: LinkRelationship;
    to: string;
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
    content: string;
    raw: string;
}
export interface ContextBundleContent {
    type: string;
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
    id: string;
    version: string;
    created?: string;
    content: ContextBundleContent;
    frame: ContextBundleFrame;
    lineage?: ContextBundleLineage;
    policy?: ContextBundlePolicy;
    resolution: ContextBundleResolution;
    explain?: ContextBundleExplain;
}
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
//# sourceMappingURL=types.d.ts.map