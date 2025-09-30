/**
 * AI Handoff Manager
 * Manages AI session handoffs with ORMD documentation
 */

import { v4 as uuidv4 } from 'uuid';
import { ORMDParser } from '@nexes/ormd-parser';
import { ContextStorage } from '@nexes/context-storage';
import {
  HandoffAgent,
  HandoffSession,
  HandoffDocument,
  HandoffContext,
  HandoffDecision,
  HandoffArtifact,
  HandoffIssue,
  HandoffQuery
} from './types';

export class HandoffManager {
  private storage: ContextStorage;
  private currentSession?: HandoffSession;

  constructor(storage: ContextStorage) {
    this.storage = storage;
  }

  /**
   * Start a new AI session
   */
  async startSession(agent: HandoffAgent, parentSessionId?: string): Promise<HandoffSession> {
    const session: HandoffSession = {
      id: uuidv4(),
      start_time: new Date().toISOString(),
      agents: [agent],
      current_agent: agent,
      status: 'active',
      context: {
        session_id: uuidv4(),
        parent_session_id: parentSessionId,
        session_start: new Date().toISOString(),
        summary: '',
        objectives_completed: [],
        objectives_partial: [],
        objectives_not_started: [],
        decisions: [],
        system_state: {
          working_directory: process.cwd()
        },
        artifacts: [],
        unresolved_issues: [],
        recommended_next_steps: [],
        context_notes: '',
        important_constraints: []
      }
    };

    this.currentSession = session;
    return session;
  }

  /**
   * Add a decision to the current session
   */
  addDecision(description: string, rationale: string, confidence: 'low' | 'medium' | 'high', alternatives?: string[]): HandoffDecision {
    if (!this.currentSession) {
      throw new Error('No active session');
    }

    const decision: HandoffDecision = {
      id: uuidv4(),
      description,
      rationale,
      alternatives_considered: alternatives,
      confidence,
      timestamp: new Date().toISOString()
    };

    this.currentSession.context.decisions.push(decision);
    return decision;
  }

  /**
   * Add an artifact (file, commit, etc.) to the current session
   */
  addArtifact(type: HandoffArtifact['type'], path: string, description: string, status: HandoffArtifact['status']): HandoffArtifact {
    if (!this.currentSession) {
      throw new Error('No active session');
    }

    const artifact: HandoffArtifact = {
      id: uuidv4(),
      type,
      path,
      description,
      status
    };

    this.currentSession.context.artifacts.push(artifact);
    return artifact;
  }

  /**
   * Add an unresolved issue
   */
  addIssue(description: string, severity: HandoffIssue['severity'], context?: string, suggestedApproach?: string): HandoffIssue {
    if (!this.currentSession) {
      throw new Error('No active session');
    }

    const issue: HandoffIssue = {
      id: uuidv4(),
      description,
      severity,
      context,
      suggested_approach: suggestedApproach
    };

    this.currentSession.context.unresolved_issues.push(issue);
    return issue;
  }

  /**
   * Update session context
   */
  updateContext(updates: Partial<HandoffContext>): void {
    if (!this.currentSession) {
      throw new Error('No active session');
    }

    this.currentSession.context = {
      ...this.currentSession.context,
      ...updates
    };
  }

  /**
   * Generate handoff document
   */
  generateHandoffDocument(toAgent?: HandoffAgent, handoffReason: HandoffDocument['frontmatter']['handoff']['handoff_reason'] = 'session_end'): HandoffDocument {
    if (!this.currentSession) {
      throw new Error('No active session');
    }

    const session = this.currentSession;
    const endTime = new Date().toISOString();

    // Generate markdown content
    const content = this.generateMarkdownContent(session.context);

    const document: HandoffDocument = {
      frontmatter: {
        title: `AI Handoff: ${session.context.summary || 'Session ' + session.id.substring(0, 8)}`,
        type: 'ai_handoff',
        authors: session.agents,
        dates: {
          created: endTime,
          session_start: session.start_time,
          session_end: endTime
        },
        context: {
          lineage: {
            source: 'ai-session-handoff',
            parent_session: session.context.parent_session_id,
            derivation: session.context.parent_session_id ? 'continuation' : 'restart',
            confidence_flow: 'preserved'
          },
          resolution: {
            confidence: 'working',
            status: 'handoff_ready'
          }
        },
        handoff: {
          from_agent: session.current_agent.id,
          to_agent: toAgent?.id,
          handoff_reason: handoffReason
        }
      },
      content,
      handoff_context: session.context
    };

    return document;
  }

  /**
   * Create handoff and store as ORMD document
   */
  async createHandoff(toAgent?: HandoffAgent, handoffReason?: HandoffDocument['frontmatter']['handoff']['handoff_reason']): Promise<string> {
    const document = this.generateHandoffDocument(toAgent, handoffReason);
    
    // Convert to ORMD format and store
    const ormdContent = this.documentToORMD(document);
    const parseResult = ORMDParser.parse(ormdContent);
    
    if (!parseResult.success) {
      throw new Error(`Failed to parse generated ORMD: ${parseResult.errors?.join(', ')}`);
    }

    if (!parseResult.data) {
      throw new Error('Parse result contains no data');
    }
    const contextBundle = ORMDParser.toContextBundle(parseResult.data);
    const stored = await this.storage.store(contextBundle);

    // Mark session as completed
    if (this.currentSession) {
      this.currentSession.status = 'completed';
      this.currentSession.end_time = new Date().toISOString();
    }

    return stored.id;
  }

  /**
   * Load a previous handoff for continuation
   */
  async loadHandoff(handoffId: string): Promise<HandoffDocument> {
    const bundle = await this.storage.get(handoffId);
    if (!bundle) {
      throw new Error(`Handoff not found: ${handoffId}`);
    }

    // Parse the ORMD content to extract handoff data
    const parseResult = ORMDParser.parse(bundle.content.data);
    if (!parseResult.success || !parseResult.data) {
      throw new Error(`Failed to parse handoff document: ${parseResult.errors?.join(', ')}`);
    }

    // Extract handoff context from the document
    // This is a simplified version - in practice we'd need more robust parsing
    const handoffContext: HandoffContext = JSON.parse(
      bundle.content.data.split('<!-- HANDOFF_CONTEXT -->')[1]?.split('<!-- /HANDOFF_CONTEXT -->')[0] || '{}'
    );

    return {
      frontmatter: parseResult.data.frontmatter as any,
      content: parseResult.data.content,
      handoff_context: handoffContext
    };
  }

  /**
   * Search handoffs
   */
  async searchHandoffs(query: HandoffQuery): Promise<string[]> {
    // Build search query for the storage layer
    const searchQuery: any = {
      content_type: 'text/markdown'
    };

    if (query.session_id) {
      searchQuery.search = query.session_id;
    }

    if (query.agent_id) {
      searchQuery.search = (searchQuery.search || '') + ' ' + query.agent_id;
    }

    const results = await this.storage.query(searchQuery);
    return results.bundles.map(bundle => bundle.id);
  }

  /**
   * Generate markdown content for handoff document
   */
  private generateMarkdownContent(context: HandoffContext): string {
    const sections = [
      '# AI Handoff Session',
      '',
      '## Session Summary',
      context.summary || 'No summary provided',
      '',
      '## Objectives Status',
      '### ✅ Completed',
      ...context.objectives_completed.map(obj => `- ${obj}`),
      '',
      '### 🔄 In Progress', 
      ...context.objectives_partial.map(obj => `- ${obj}`),
      '',
      '### 📋 Not Started',
      ...context.objectives_not_started.map(obj => `- ${obj}`),
      ''
    ];

    if (context.decisions.length > 0) {
      sections.push('## Key Decisions');
      context.decisions.forEach(decision => {
        sections.push(`### ${decision.description}`);
        sections.push(`**Rationale:** ${decision.rationale}`);
        sections.push(`**Confidence:** ${decision.confidence}`);
        if (decision.alternatives_considered) {
          sections.push(`**Alternatives Considered:** ${decision.alternatives_considered.join(', ')}`);
        }
        sections.push('');
      });
    }

    if (context.artifacts.length > 0) {
      sections.push('## Artifacts Created/Modified');
      context.artifacts.forEach(artifact => {
        sections.push(`- **${artifact.status}** ${artifact.type}: \`${artifact.path}\` - ${artifact.description}`);
      });
      sections.push('');
    }

    if (context.unresolved_issues.length > 0) {
      sections.push('## Unresolved Issues');
      context.unresolved_issues.forEach(issue => {
        sections.push(`### ${issue.description} (${issue.severity})`);
        if (issue.context) sections.push(`**Context:** ${issue.context}`);
        if (issue.suggested_approach) sections.push(`**Suggested Approach:** ${issue.suggested_approach}`);
        sections.push('');
      });
    }

    sections.push('## Next Steps');
    context.recommended_next_steps.forEach(step => {
      sections.push(`- ${step}`);
    });

    if (context.context_notes) {
      sections.push('');
      sections.push('## Context Notes');
      sections.push(context.context_notes);
    }

    if (context.important_constraints.length > 0) {
      sections.push('');
      sections.push('## Important Constraints');
      context.important_constraints.forEach(constraint => {
        sections.push(`- ${constraint}`);
      });
    }

    // Embed the full context as JSON for parsing later
    sections.push('');
    sections.push('<!-- HANDOFF_CONTEXT -->');
    sections.push(JSON.stringify(context, null, 2));
    sections.push('<!-- /HANDOFF_CONTEXT -->');

    return sections.join('\n');
  }

  /**
   * Convert HandoffDocument to ORMD format
   */
  private documentToORMD(document: HandoffDocument): string {
    const yamlFrontmatter = [
      '---',
      `title: "${document.frontmatter.title}"`,
      `type: "${document.frontmatter.type}"`,
      'authors:',
      ...document.frontmatter.authors.map(author => 
        `  - id: "${author.id}"\n    display: "${author.display}"\n    type: "${author.type}"`
      ),
      'dates:',
      `  created: "${document.frontmatter.dates.created}"`,
      `  session_start: "${document.frontmatter.dates.session_start}"`,
      ...(document.frontmatter.dates.session_end ? [`  session_end: "${document.frontmatter.dates.session_end}"`] : []),
      'context:',
      '  lineage:',
      `    source: "${document.frontmatter.context.lineage.source}"`,
      ...(document.frontmatter.context.lineage.parent_session ? [`    parent_session: "${document.frontmatter.context.lineage.parent_session}"`] : []),
      `    derivation: "${document.frontmatter.context.lineage.derivation}"`,
      `    confidence_flow: "${document.frontmatter.context.lineage.confidence_flow}"`,
      '  resolution:',
      `    confidence: "${document.frontmatter.context.resolution.confidence}"`,
      `    status: "${document.frontmatter.context.resolution.status}"`,
      'handoff:',
      `  from_agent: "${document.frontmatter.handoff.from_agent}"`,
      ...(document.frontmatter.handoff.to_agent ? [`  to_agent: "${document.frontmatter.handoff.to_agent}"`] : []),
      `  handoff_reason: "${document.frontmatter.handoff.handoff_reason}"`,
      '---',
      ''
    ].join('\n');

    return `<!-- ormd:0.1 -->\n${yamlFrontmatter}${document.content}`;
  }

  /**
   * Get current session
   */
  getCurrentSession(): HandoffSession | undefined {
    return this.currentSession;
  }
}
