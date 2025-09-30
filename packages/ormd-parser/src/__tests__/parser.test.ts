import { ORMDParser } from '../parser';

describe('ORMDParser', () => {
  const validOrmDocument = `<!-- ormd:0.1 -->\n---\n` +
    `title: Decision Record\n` +
    `dates:\n` +
    `  created: '2024-02-01T09:30:00Z'\n` +
    `  modified: '2024-02-10T11:00:00Z'\n` +
    `context:\n` +
    `  resolution:\n` +
    `    confidence: validated\n` +
    `    evidence_strength: strong\n` +
    `  lineage:\n` +
    `    source: synthesis-pipeline\n` +
    `status: active\n` +
    `version: '2.0'\n` +
    `description: Example ORMD snippet inspired by platform documentation.\n` +
    `---\n\n` +
    `# Decision Context\n\n` +
    `Documented resolution and supporting metadata.`;

  it('parses, validates, and converts a valid ORMD document', () => {
    const parseResult = ORMDParser.parse(validOrmDocument);

    expect(parseResult.success).toBe(true);
    expect(parseResult.data).toBeDefined();
    expect(parseResult?.warnings).toBeUndefined();

    const document = parseResult.data!;
    expect(document.frontmatter.title).toBe('Decision Record');

    const validation = ORMDParser.validate(document);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toBeUndefined();

    const bundle = ORMDParser.toContextBundle(document, 'urn:cb:TESTBUNDLE');
    expect(bundle.id).toBe('urn:cb:TESTBUNDLE');
    expect(bundle.version).toBe('2.0');
    expect(bundle.created).toBe('2024-02-01T09:30:00Z');
    expect(bundle.content.data).toBe(validOrmDocument);
    expect(bundle.frame.type).toBe('ormd.document');
    expect(bundle.resolution.confidence).toBe('validated');
    expect(bundle.resolution.evidence_strength).toBe('strong');
  });

  it('fails to parse content without ORMD frontmatter', () => {
    const noFrontmatter = `<!-- ormd:0.1 -->\n` +
      `# Untitled\n\n` +
      `This content omits the required YAML block.`;

    const parseResult = ORMDParser.parse(noFrontmatter);

    expect(parseResult.success).toBe(false);
    expect(parseResult.errors).toContain('Invalid ORMD format: missing YAML frontmatter');
  });

  it('emits a warning when the ORMD version comment is missing', () => {
    const missingComment = `---\n` +
      `title: Missing Comment Example\n` +
      `dates:\n` +
      `  created: '2024-01-15T10:00:00Z'\n` +
      `---\n\n` +
      `Content still follows the schema.`;

    const parseResult = ORMDParser.parse(missingComment);

    expect(parseResult.success).toBe(true);
    expect(parseResult.warnings).toEqual([
      'Missing ORMD version comment (<!-- ormd:0.1 -->)'
    ]);
  });
});
