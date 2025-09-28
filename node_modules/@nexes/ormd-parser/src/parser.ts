import * as yaml from 'js-yaml';
import { 
  ORMDDocument, 
  ORMDFrontmatter, 
  ParseResult,
  ValidationResult,
  ContextBundle 
} from './types';

/**
 * ORMD Parser - Parses Organizational Relational Markdown documents
 */
export class ORMDParser {
  private static readonly ORMD_COMMENT_REGEX = /^<!--\s*ormd:(\d+\.\d+)\s*-->/;
  private static readonly FRONTMATTER_REGEX = /^(?:<!--.*?-->\s*\n)?---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;

  /**
   * Parse an ORMD document from string content
   */
  static parse(content: string): ParseResult<ORMDDocument> {
    try {
      const lines = content.split('\n');
      const errors: string[] = [];
      const warnings: string[] = [];

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
      let frontmatter: ORMDFrontmatter;
      try {
        frontmatter = yaml.load(frontmatterYaml) as ORMDFrontmatter;
      } catch (yamlError) {
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

      const document: ORMDDocument = {
        frontmatter,
        content: markdownContent.trim(),
        raw: content
      };

      return {
        success: true,
        data: document,
        warnings: warnings.length > 0 ? warnings : undefined
      };

    } catch (error) {
      return {
        success: false,
        errors: [`Parse error: ${error}`]
      };
    }
  }

  /**
   * Validate an ORMD document structure
   */
  static validate(document: ORMDDocument): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

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
  static toContextBundle(document: ORMDDocument, bundleId?: string): ContextBundle {
    const fm = document.frontmatter;
    
    // Generate bundle ID if not provided
    const id = bundleId || `urn:cb:${this.generateULID()}`;

    const bundle: ContextBundle = {
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
  static serialize(document: ORMDDocument): string {
    const frontmatterYaml = yaml.dump(document.frontmatter, {
      indent: 2,
      lineWidth: -1,
      noRefs: true
    });

    return `<!-- ormd:0.1 -->\n---\n${frontmatterYaml}---\n\n${document.content}`;
  }

  private static isValidISO8601(dateString: string): boolean {
    const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
    return iso8601Regex.test(dateString);
  }

  private static generateULID(): string {
    // Simple ULID-like ID generator (not cryptographically secure)
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 15);
    return `${timestamp}${random}`.toUpperCase();
  }
}
