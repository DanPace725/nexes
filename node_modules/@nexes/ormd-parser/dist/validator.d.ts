import { ValidationResult } from './types';
/**
 * JSON Schema validator for ContextBundle format
 */
export declare class ContextBundleValidator {
    private static ajv;
    private static contextBundleSchema;
    private static validate;
    /**
     * Validate a ContextBundle against the JSON schema
     */
    static validateContextBundle(bundle: unknown): ValidationResult;
    /**
     * Validate ContextBundle ID format
     */
    static validateBundleId(id: string): boolean;
    /**
     * Validate ISO-8601 timestamp
     */
    static validateTimestamp(timestamp: string): boolean;
}
//# sourceMappingURL=validator.d.ts.map