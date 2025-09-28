import { ORMDDocument, ParseResult, ValidationResult, ContextBundle } from './types';
/**
 * ORMD Parser - Parses Organizational Relational Markdown documents
 */
export declare class ORMDParser {
    private static readonly ORMD_COMMENT_REGEX;
    private static readonly FRONTMATTER_REGEX;
    /**
     * Parse an ORMD document from string content
     */
    static parse(content: string): ParseResult<ORMDDocument>;
    /**
     * Validate an ORMD document structure
     */
    static validate(document: ORMDDocument): ValidationResult;
    /**
     * Convert ORMD document to ContextBundle
     */
    static toContextBundle(document: ORMDDocument, bundleId?: string): ContextBundle;
    /**
     * Serialize ORMD document back to string
     */
    static serialize(document: ORMDDocument): string;
    private static isValidISO8601;
    private static generateULID;
}
//# sourceMappingURL=parser.d.ts.map