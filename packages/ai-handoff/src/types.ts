/**
 * Types for AI Handoff Protocol
 * Defines structures for seamless context preservation across AI sessions
 */

export interface HandoffAgent {
  id: string;
  type: 'human' | 'ai' | 'system';
  display: string;
  model?: string; // For AI agents: "claude-sonnet-4", "gpt-4", etc.
  version?: string;
}

export interface HandoffDecision {
  id: string;
  description: string;
  rationale: string;
  alternatives_considered?: string[];
  confidence: 'low' | 'medium' | 'high';
  timestamp: string;
}

export interface HandoffArtifact {
  id: string;
  type: 'file' | 'directory' | 'commit' | 'command' | 'url' | 'other';
  path: string;
  description: string;
  status: 'created' | 'modified' | 'deleted' | 'referenced';
}

export interface HandoffIssue {
  id: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'blocker';
  context?: string;
  suggested_approach?: string;
}

export interface HandoffContext {
  session_id: string;
  parent_session_id?: string;
  session_start: string;
  session_end?: string;
  
  // What was accomplished
  summary: string;
  objectives_completed: string[];
  objectives_partial: string[];
  objectives_not_started: string[];
  
  // Key decisions made
  decisions: HandoffDecision[];
  
  // Current system state
  system_state: {
    working_directory: string;
    git_branch?: string;
    git_commit?: string;
    environment_notes?: string;
  };
  
  // Artifacts created/modified
  artifacts: HandoffArtifact[];
  
  // Issues and blockers
  unresolved_issues: HandoffIssue[];
  
  // Next steps
  recommended_next_steps: string[];
  
  // Context for next agent
  context_notes: string;
  important_constraints: string[];
}

export interface HandoffDocument {
  // Standard ORMD structure
  frontmatter: {
    title: string;
    type: 'ai_handoff';
    authors: HandoffAgent[];
    dates: {
      created: string;
      session_start: string;
      session_end?: string;
    };
    context: {
      lineage: {
        source: string;
        parent_session?: string;
        derivation: 'continuation' | 'branch' | 'merge' | 'restart';
        confidence_flow: 'preserved' | 'degraded' | 'enhanced';
      };
      resolution: {
        confidence: 'exploratory' | 'working' | 'validated';
        status: 'in_progress' | 'handoff_ready' | 'completed' | 'blocked';
      };
    };
    handoff: {
      from_agent: string;
      to_agent?: string; // undefined if open handoff
      handoff_reason: 'session_end' | 'agent_switch' | 'escalation' | 'completion';
    };
  };
  
  content: string; // Markdown content
  handoff_context: HandoffContext;
}

export interface HandoffSession {
  id: string;
  start_time: string;
  end_time?: string;
  agents: HandoffAgent[];
  current_agent: HandoffAgent;
  context: HandoffContext;
  status: 'active' | 'handoff_pending' | 'completed';
}

export interface HandoffQuery {
  session_id?: string;
  agent_id?: string;
  date_range?: {
    start: string;
    end: string;
  };
  contains_artifacts?: string[];
  has_unresolved_issues?: boolean;
  status?: string[];
}
