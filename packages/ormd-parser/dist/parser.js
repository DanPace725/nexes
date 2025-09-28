"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ORMDParser = void 0;
const yaml = __importStar(require("js-yaml"));
/**
 * ORMD Parser - Parses Organizational Relational Markdown documents
 */
class ORMDParser {
    /**
     * Parse an ORMD document from string content
     */
    static parse(content) {
        try {
            const lines = content.split('\n');
            const errors = [];
            const warnings = [];
            // Check for ORMD version comment
            if (lines.length === 0 || !this.ORMD_COMMENT_REGEX.test(lines[0])) {
                warnings.push('Missing ORMD version comment (<!-- ormd:0.1 -->)');
            }
            // Extract frontmatter and content
            const match = content.match(this.FRONTMATTER_REGEX);
            if (!match) {
                return {
                    success: false,
                    errors: ['Invalid ORMD format: missing YAML frontmatter']
                };
            }
            const [, frontmatterYaml, markdownContent] = match;
            // Parse YAML frontmatter
            let frontmatter;
            try {
                frontmatter = yaml.load(frontmatterYaml);
            }
            catch (yamlError) {
                return {
                    success: false,
                    errors: [`Invalid YAML frontmatter: ${yamlError}`]
                };
            }
            // Validate required fields
            if (!frontmatter.title) {
                errors.push('Missing required field: title');
            }
            if (!frontmatter.dates) {
                errors.push('Missing required field: dates');
            }
            if (frontmatter.dates && !frontmatter.dates.created) {
                errors.push('Missing required field: dates.created');
            }
            // Validate date formats
            if (frontmatter.dates?.created && !this.isValidISO8601(frontmatter.dates.created)) {
                errors.push('Invalid date format for dates.created (must be ISO-8601)');
            }
            if (frontmatter.dates?.modified && !this.isValidISO8601(frontmatter.dates.modified)) {
                errors.push('Invalid date format for dates.modified (must be ISO-8601)');
            }
            if (errors.length > 0) {
                return {
                    success: false,
                    errors,
                    warnings
                };
            }
            const document = {
                frontmatter,
                content: markdownContent.trim(),
                raw: content
            };
            return {
                success: true,
                data: document,
                warnings: warnings.length > 0 ? warnings : undefined
            };
        }
        catch (error) {
            return {
                success: false,
                errors: [`Parse error: ${error}`]
            };
        }
    }
    /**
     * Validate an ORMD document structure
     */
    static validate(document) {
        const errors = [];
        const warnings = [];
        // Validate frontmatter structure
        const fm = document.frontmatter;
        // Required fields
        if (!fm.title || fm.title.trim().length === 0) {
            errors.push('Title is required and cannot be empty');
        }
        if (!fm.dates || !fm.dates.created) {
            errors.push('Created date is required');
        }
        // Validate confidence levels
        if (fm.context?.resolution?.confidence) {
            const validConfidence = ['exploratory', 'working', 'validated'];
            if (!validConfidence.includes(fm.context.resolution.confidence)) {
                errors.push(`Invalid confidence level: ${fm.context.resolution.confidence}`);
            }
        }
        // Validate evidence strength
        if (fm.context?.resolution?.evidence_strength) {
            const validStrength = ['weak', 'moderate', 'strong'];
            if (!validStrength.includes(fm.context.resolution.evidence_strength)) {
                errors.push(`Invalid evidence strength: ${fm.context.resolution.evidence_strength}`);
            }
        }
        // Validate status
        if (fm.status) {
            const validStatus = ['draft', 'active', 'archived', 'deprecated'];
            if (!validStatus.includes(fm.status)) {
                errors.push(`Invalid status: ${fm.status}`);
            }
        }
        // Validate links
        if (fm.links) {
            fm.links.forEach((link, index) => {
                if (!link.id || !link.rel || !link.to) {
                    errors.push(`Link ${index}: missing required fields (id, rel, to)`);
                }
            });
        }
        // Validate authors
        if (fm.authors) {
            fm.authors.forEach((author, index) => {
                if (!author.id || !author.display) {
                    errors.push(`Author ${index}: missing required fields (id, display)`);
                }
            });
        }
        // Content validation
        if (!document.content || document.content.trim().length === 0) {
            warnings.push('Document content is empty');
        }
        return {
            valid: errors.length === 0,
            errors: errors.length > 0 ? errors : undefined,
            warnings: warnings.length > 0 ? warnings : undefined
        };
    }
    /**
     * Convert ORMD document to ContextBundle
     */
    static toContextBundle(document, bundleId) {
        const fm = document.frontmatter;
        // Generate bundle ID if not provided
        const id = bundleId || `urn:cb:${this.generateULID()}`;
        const bundle = {
            id,
            version: fm.version || '1.0',
            created: fm.dates.created,
            content: {
                type: 'text/markdown',
                data: document.raw,
                encoding: 'utf-8'
            },
            frame: {
                type: 'ormd.document',
                scope: 'local'
            },
            resolution: {
                confidence: fm.context?.resolution?.confidence || 'working',
                evidence_strength: fm.context?.resolution?.evidence_strength,
                validation_status: fm.status
            }
        };
        // Add lineage if available
        if (fm.context?.lineage) {
            bundle.lineage = {
                source_type: 'ormd',
                source_id: fm.context.lineage.source || 'unknown',
                parent_bundles: fm.context.lineage.parent_docs,
                derivation: fm.context.lineage.derivation_method || 'synthesis',
                confidence_flow: fm.context.lineage.confidence_inheritance || 'preserved'
            };
        }
        // Add policy if needed
        bundle.policy = {
            access_level: 'public',
            usage_rights: 'cc-by-sa-4.0'
        };
        return bundle;
    }
    /**
     * Serialize ORMD document back to string
     */
    static serialize(document) {
        const frontmatterYaml = yaml.dump(document.frontmatter, {
            indent: 2,
            lineWidth: -1,
            noRefs: true
        });
        return `<!-- ormd:0.1 -->\n---\n${frontmatterYaml}---\n\n${document.content}`;
    }
    static isValidISO8601(dateString) {
        const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
        return iso8601Regex.test(dateString);
    }
    static generateULID() {
        // Simple ULID-like ID generator (not cryptographically secure)
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 15);
        return `${timestamp}${random}`.toUpperCase();
    }
}
exports.ORMDParser = ORMDParser;
ORMDParser.ORMD_COMMENT_REGEX = /^<!--\s*ormd:(\d+\.\d+)\s*-->/;
ORMDParser.FRONTMATTER_REGEX = /^(?:<!--.*?-->\s*\n)?---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
//# sourceMappingURL=parser.js.map