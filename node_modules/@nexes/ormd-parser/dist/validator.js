"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContextBundleValidator = void 0;
const ajv_1 = __importDefault(require("ajv"));
/**
 * JSON Schema validator for ContextBundle format
 */
class ContextBundleValidator {
    /**
     * Validate a ContextBundle against the JSON schema
     */
    static validateContextBundle(bundle) {
        const valid = this.validate(bundle);
        if (valid) {
            return { valid: true };
        }
        const errors = this.validate.errors?.map(error => {
            const path = error.instancePath || 'root';
            return `${path}: ${error.message}`;
        }) || ['Unknown validation error'];
        return {
            valid: false,
            errors
        };
    }
    /**
     * Validate ContextBundle ID format
     */
    static validateBundleId(id) {
        return /^urn:cb:[A-Z0-9]+$/.test(id);
    }
    /**
     * Validate ISO-8601 timestamp
     */
    static validateTimestamp(timestamp) {
        const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
        if (!iso8601Regex.test(timestamp)) {
            return false;
        }
        // Check if it's a valid date
        const date = new Date(timestamp);
        return !isNaN(date.getTime());
    }
}
exports.ContextBundleValidator = ContextBundleValidator;
_a = ContextBundleValidator;
ContextBundleValidator.ajv = new ajv_1.default({ allErrors: true });
ContextBundleValidator.contextBundleSchema = {
    type: 'object',
    properties: {
        id: { type: 'string', pattern: '^urn:cb:' },
        version: { type: 'string' },
        created: { type: 'string', nullable: true },
        content: {
            type: 'object',
            properties: {
                type: { type: 'string' },
                data: { type: 'string' },
                encoding: { type: 'string', nullable: true }
            },
            required: ['type', 'data'],
            additionalProperties: false
        },
        frame: {
            type: 'object',
            properties: {
                type: { type: 'string' },
                perspective: { type: 'string', nullable: true },
                domain: { type: 'string', nullable: true },
                scope: { type: 'string', enum: ['local', 'global', 'federated'], nullable: true }
            },
            required: ['type'],
            additionalProperties: false
        },
        lineage: {
            type: 'object',
            properties: {
                source_type: { type: 'string' },
                source_id: { type: 'string' },
                parent_bundles: {
                    type: 'array',
                    items: { type: 'string' },
                    nullable: true
                },
                derivation: {
                    type: 'string',
                    enum: ['synthesis', 'extraction', 'translation', 'evolution']
                },
                confidence_flow: {
                    type: 'string',
                    enum: ['preserved', 'degraded', 'enhanced']
                }
            },
            required: ['source_type', 'source_id', 'derivation', 'confidence_flow'],
            additionalProperties: false,
            nullable: true
        },
        policy: {
            type: 'object',
            properties: {
                access_level: {
                    type: 'string',
                    enum: ['public', 'private', 'restricted']
                },
                usage_rights: { type: 'string', nullable: true },
                retention_period: { type: 'string', nullable: true },
                privacy_constraints: {
                    type: 'array',
                    items: { type: 'string' },
                    nullable: true
                }
            },
            required: ['access_level'],
            additionalProperties: false,
            nullable: true
        },
        resolution: {
            type: 'object',
            properties: {
                confidence: {
                    type: 'string',
                    enum: ['exploratory', 'working', 'validated']
                },
                evidence_strength: {
                    type: 'string',
                    enum: ['weak', 'moderate', 'strong'],
                    nullable: true
                },
                uncertainty_bounds: {
                    type: 'object',
                    properties: {
                        temporal: { type: 'string', nullable: true },
                        domain: { type: 'string', nullable: true },
                        precision: { type: 'string', nullable: true }
                    },
                    additionalProperties: false,
                    nullable: true
                },
                validation_status: { type: 'string', nullable: true }
            },
            required: ['confidence'],
            additionalProperties: false
        },
        explain: {
            type: 'object',
            properties: {
                reasoning_trace: {
                    type: 'array',
                    items: { type: 'string' },
                    nullable: true
                },
                evidence_summary: {
                    type: 'object',
                    properties: {
                        support_count: { type: 'number', nullable: true },
                        contradiction_count: { type: 'number', nullable: true },
                        uncertainty_factors: {
                            type: 'array',
                            items: { type: 'string' },
                            nullable: true
                        }
                    },
                    additionalProperties: false,
                    nullable: true
                },
                methodology: { type: 'string', nullable: true }
            },
            additionalProperties: false,
            nullable: true
        }
    },
    required: ['id', 'version', 'content', 'frame', 'resolution'],
    additionalProperties: false
};
ContextBundleValidator.validate = _a.ajv.compile(_a.contextBundleSchema);
//# sourceMappingURL=validator.js.map