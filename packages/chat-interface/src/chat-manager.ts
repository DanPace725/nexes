/**
 * Chat Manager with AI Handoff Integration
 * Demonstrates how chat messages can be enriched with ORMD context
 */

import { v4 as uuidv4 } from 'uuid';
import { ContextStorage } from '@nexes/context-storage';
import { HandoffManager, HandoffAgent, HandoffDocument } from '@nexes/ai-handoff';
import { ORMDParser } from '@nexes/ormd-parser';

export interface ChatMessage {
  id: string;
  timestamp: string;
  sender: {
    id: string;
    display: string;
    type: 'human' | 'ai' | 'system';
  };
  content: string;
  context?: {
    handoff_id?: string;
    session_id?: string;
    decision_ids?: string[];
    artifact_ids?: string[];
  };
}

export interface ChatSession {
  id: string;
  title: string;
  created: string;
  participants: Array<{
    id: string;
    display: string;
    type: 'human' | 'ai' | 'system';
  }>;
  messages: ChatMessage[];
  handoff_session_id?: string;
  status: 'active' | 'completed' | 'archived';
}

export class ChatManager {
  private storage: ContextStorage;
  private handoffManager: HandoffManager;
  private currentSession?: ChatSession;

  constructor(storage: ContextStorage) {
    this.storage = storage;
    this.handoffManager = new HandoffManager(storage);
  }

  /**
   * Start a new chat session
   */
  async startChatSession(title: string, user: ChatMessage['sender']): Promise<ChatSession> {
    const session: ChatSession = {
      id: uuidv4(),
      title,
      created: new Date().toISOString(),
      participants: [user],
      messages: [],
      status: 'active'
    };

    this.currentSession = session;

    // Add welcome message
    await this.addMessage({
      sender: { id: 'system', display: 'Nexes System', type: 'system' },
      content: `Welcome to Nexes! This chat session supports AI handoffs with full context preservation. Session ID: ${session.id.substring(0, 8)}`
    });

    return session;
  }

  /**
   * Add a message to the current session
   */
  async addMessage(message: Omit<ChatMessage, 'id' | 'timestamp'>): Promise<ChatMessage> {
    if (!this.currentSession) {
      throw new Error('No active chat session');
    }

    const fullMessage: ChatMessage = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      ...message
    };

    this.currentSession.messages.push(fullMessage);

    // If this is from an AI agent, check if we should start a handoff session
    if (message.sender.type === 'ai' && !this.currentSession.handoff_session_id) {
      await this.initializeHandoffSession(message.sender as HandoffAgent);
    }

    return fullMessage;
  }

  /**
   * Initialize handoff session for AI tracking
   */
  private async initializeHandoffSession(aiAgent: HandoffAgent): Promise<void> {
    if (!this.currentSession) return;

    const handoffSession = await this.handoffManager.startSession(aiAgent);
    this.currentSession.handoff_session_id = handoffSession.id;

    // Initialize with chat context
    this.handoffManager.updateContext({
      summary: `Chat session: ${this.currentSession.title}`,
      objectives_completed: [],
      objectives_partial: [`Engaging in chat session "${this.currentSession.title}"`],
      objectives_not_started: [],
      context_notes: `Chat session started with ${this.currentSession.participants.length} participants`
    });
  }

  /**
   * Add a decision made during chat
   */
  async addChatDecision(description: string, rationale: string, confidence: 'low' | 'medium' | 'high'): Promise<string> {
    if (!this.currentSession?.handoff_session_id) {
      throw new Error('No active handoff session');
    }

    const decision = this.handoffManager.addDecision(description, rationale, confidence);
    
    // Add system message about the decision
    await this.addMessage({
      sender: { id: 'system', display: 'Decision Tracker', type: 'system' },
      content: `📝 Decision recorded: ${description} (confidence: ${confidence})`,
      context: { decision_ids: [decision.id] }
    });

    return decision.id;
  }

  /**
   * Create handoff from current chat session
   */
  async createChatHandoff(
    toAgent?: HandoffAgent,
    reason: string = 'Chat session handoff',
    handoffReason: HandoffDocument['frontmatter']['handoff']['handoff_reason'] = 'agent_switch'
  ): Promise<string> {
    if (!this.currentSession?.handoff_session_id) {
      throw new Error('No active handoff session');
    }

    // Update context with chat summary
    const messageCount = this.currentSession.messages.length;
    const participantNames = this.currentSession.participants.map(p => p.display).join(', ');

    this.handoffManager.updateContext({
      summary: `Chat session ${this.currentSession.title} with ${participantNames}`,
      objectives_completed: [`Completed chat session with ${messageCount} messages`],
      recommended_next_steps: [
        'Review chat history for key decisions',
        'Continue conversation with context preserved',
        'Extract actionable items from discussion'
      ],
      context_notes: `Chat session included ${messageCount} messages between ${participantNames}. Full conversation history available in chat logs.`,
      artifacts: [
        {
          id: uuidv4(),
          type: 'other',
          path: `chat-session-${this.currentSession.id}`,
          description: `Chat session: ${this.currentSession.title}`,
          status: 'created'
        }
      ]
    });

    const handoffId = await this.handoffManager.createHandoff(toAgent, handoffReason);

    // Add handoff message to chat
    await this.addMessage({
      sender: { id: 'system', display: 'Handoff System', type: 'system' },
      content: `🔄 Handoff created: ${reason}. Context preserved for next agent. Handoff ID: ${handoffId.substring(0, 16)}`,
      context: { handoff_id: handoffId }
    });

    this.currentSession.status = 'completed';
    return handoffId;
  }

  /**
   * Continue chat from handoff
   */
  async continueChatFromHandoff(handoffId: string, newAgent: HandoffAgent, user: ChatMessage['sender']): Promise<ChatSession> {
    const handoff = await this.handoffManager.loadHandoff(handoffId);
    
    const session: ChatSession = {
      id: uuidv4(),
      title: `Continued: ${handoff.handoff_context.summary}`,
      created: new Date().toISOString(),
      participants: [user, newAgent],
      messages: [],
      status: 'active'
    };

    this.currentSession = session;

    // Start new handoff session as continuation
    const newHandoffSession = await this.handoffManager.startSession(
      newAgent, 
      handoff.handoff_context.session_id
    );
    session.handoff_session_id = newHandoffSession.id;

    // Load context from previous handoff
    this.handoffManager.updateContext({
      ...handoff.handoff_context,
      session_id: newHandoffSession.id,
      session_start: new Date().toISOString(),
      objectives_completed: [
        ...handoff.handoff_context.objectives_completed,
        'Successfully loaded context from previous session'
      ]
    });

    // Add context message
    await this.addMessage({
      sender: { id: 'system', display: 'Handoff System', type: 'system' },
      content: `🔄 Session continued from handoff. Previous context loaded:\n` +
               `• ${handoff.handoff_context.decisions.length} decisions preserved\n` +
               `• ${handoff.handoff_context.artifacts.length} artifacts tracked\n` +
               `• ${handoff.handoff_context.objectives_completed.length} objectives completed\n` +
               `• ${handoff.handoff_context.unresolved_issues.length} issues to address`,
      context: { handoff_id: handoffId, session_id: newHandoffSession.id }
    });

    return session;
  }

  /**
   * Search chat history
   */
  async searchChatHistory(query: string): Promise<ChatMessage[]> {
    if (!this.currentSession) return [];

    return this.currentSession.messages.filter(message => 
      message.content.toLowerCase().includes(query.toLowerCase()) ||
      message.sender.display.toLowerCase().includes(query.toLowerCase())
    );
  }

  /**
   * Get current session
   */
  getCurrentSession(): ChatSession | undefined {
    return this.currentSession;
  }

  /**
   * Export chat session as ORMD
   */
  async exportChatAsORMD(): Promise<string> {
    if (!this.currentSession) {
      throw new Error('No active chat session');
    }

    const session = this.currentSession;
    const messageHistory = session.messages.map(msg => 
      `**${msg.sender.display}** (${msg.timestamp}): ${msg.content}`
    ).join('\n\n');

    const ormdContent = `<!-- ormd:0.1 -->
---
title: "Chat Session: ${session.title}"
type: "chat_session"
authors:
${session.participants.map(p => `  - id: "${p.id}"\n    display: "${p.display}"\n    type: "${p.type}"`).join('\n')}
dates:
  created: "${session.created}"
  modified: "${new Date().toISOString()}"
context:
  lineage:
    source: "chat-session-export"
    derivation: "synthesis"
    confidence_flow: "preserved"
  resolution:
    confidence: "working"
session:
  id: "${session.id}"
  handoff_session_id: "${session.handoff_session_id || 'none'}"
  message_count: ${session.messages.length}
  status: "${session.status}"
---

# Chat Session: ${session.title}

## Session Information
- **Session ID**: ${session.id}
- **Created**: ${session.created}
- **Status**: ${session.status}
- **Participants**: ${session.participants.map(p => p.display).join(', ')}
- **Messages**: ${session.messages.length}

## Conversation History

${messageHistory}

## Session Summary

This chat session involved ${session.participants.length} participants and generated ${session.messages.length} messages. ${session.handoff_session_id ? `The session is linked to handoff session ${session.handoff_session_id} for context preservation.` : 'No handoff session was created.'}
`;

    return ormdContent;
  }
}
