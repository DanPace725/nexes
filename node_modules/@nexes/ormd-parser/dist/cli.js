#!/usr/bin/env node
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
const fs = __importStar(require("fs"));
const parser_1 = require("./parser");
const validator_1 = require("./validator");
function main() {
    const args = process.argv.slice(2);
    if (args.length === 0) {
        console.log('Usage: ormd-parser <command> [file]');
        console.log('Commands:');
        console.log('  parse <file>     Parse and validate ORMD file');
        console.log('  validate <file>  Validate ORMD file');
        console.log('  convert <file>   Convert ORMD to ContextBundle');
        process.exit(1);
    }
    const [command, filePath] = args;
    if (!filePath) {
        console.error('Error: File path is required');
        process.exit(1);
    }
    if (!fs.existsSync(filePath)) {
        console.error(`Error: File not found: ${filePath}`);
        process.exit(1);
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    switch (command) {
        case 'parse':
            parseCommand(content, filePath);
            break;
        case 'validate':
            validateCommand(content, filePath);
            break;
        case 'convert':
            convertCommand(content, filePath);
            break;
        default:
            console.error(`Error: Unknown command: ${command}`);
            process.exit(1);
    }
}
function parseCommand(content, filePath) {
    console.log(`Parsing ORMD file: ${filePath}`);
    const result = parser_1.ORMDParser.parse(content);
    if (result.success && result.data) {
        console.log('✅ Parse successful!');
        console.log('\nDocument metadata:');
        console.log(`  Title: ${result.data.frontmatter.title}`);
        console.log(`  Status: ${result.data.frontmatter.status || 'not specified'}`);
        console.log(`  Created: ${result.data.frontmatter.dates.created}`);
        console.log(`  Content length: ${result.data.content.length} characters`);
        if (result.data.frontmatter.context?.resolution?.confidence) {
            console.log(`  Confidence: ${result.data.frontmatter.context.resolution.confidence}`);
        }
        if (result.warnings && result.warnings.length > 0) {
            console.log('\n⚠️  Warnings:');
            result.warnings.forEach(warning => console.log(`  - ${warning}`));
        }
    }
    else {
        console.log('❌ Parse failed!');
        if (result.errors) {
            console.log('\nErrors:');
            result.errors.forEach(error => console.log(`  - ${error}`));
        }
    }
}
function validateCommand(content, filePath) {
    console.log(`Validating ORMD file: ${filePath}`);
    const parseResult = parser_1.ORMDParser.parse(content);
    if (!parseResult.success || !parseResult.data) {
        console.log('❌ Cannot validate: Parse failed');
        if (parseResult.errors) {
            parseResult.errors.forEach(error => console.log(`  - ${error}`));
        }
        return;
    }
    const validationResult = parser_1.ORMDParser.validate(parseResult.data);
    if (validationResult.valid) {
        console.log('✅ Validation successful!');
        if (validationResult.warnings && validationResult.warnings.length > 0) {
            console.log('\n⚠️  Warnings:');
            validationResult.warnings.forEach(warning => console.log(`  - ${warning}`));
        }
    }
    else {
        console.log('❌ Validation failed!');
        if (validationResult.errors) {
            console.log('\nErrors:');
            validationResult.errors.forEach(error => console.log(`  - ${error}`));
        }
    }
}
function convertCommand(content, filePath) {
    console.log(`Converting ORMD to ContextBundle: ${filePath}`);
    const parseResult = parser_1.ORMDParser.parse(content);
    if (!parseResult.success || !parseResult.data) {
        console.log('❌ Cannot convert: Parse failed');
        if (parseResult.errors) {
            parseResult.errors.forEach(error => console.log(`  - ${error}`));
        }
        return;
    }
    const contextBundle = parser_1.ORMDParser.toContextBundle(parseResult.data);
    // Validate the generated ContextBundle
    const bundleValidation = validator_1.ContextBundleValidator.validateContextBundle(contextBundle);
    if (!bundleValidation.valid) {
        console.log('❌ Generated ContextBundle is invalid!');
        if (bundleValidation.errors) {
            bundleValidation.errors.forEach(error => console.log(`  - ${error}`));
        }
        return;
    }
    console.log('✅ Conversion successful!');
    console.log('\nContextBundle:');
    console.log(JSON.stringify(contextBundle, null, 2));
    // Optionally save to file
    const outputPath = filePath.replace(/\.ormd$/, '.contextbundle.json');
    fs.writeFileSync(outputPath, JSON.stringify(contextBundle, null, 2));
    console.log(`\n💾 Saved to: ${outputPath}`);
}
if (require.main === module) {
    main();
}
//# sourceMappingURL=cli.js.map