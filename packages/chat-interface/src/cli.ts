#!/usr/bin/env node

/**
 * Simple CLI interface for testing chat with handoff integration
 */

import * as readline from 'readline';
import { writeFile } from 'fs/promises';
import path from 'path';
import { ContextStorage } from '@nexes/context-storage';
import { HandoffAgent } from '@nexes/ai-handoff';
import { ChatManager } from './chat-manager';

type HandoffReason = 'session_end' | 'agent_switch' | 'escalation' | 'completion';

class ChatCLI {
  private chatManager: ChatManager;
  private rl: readline.Interface;
  private currentUser = { id: 'user', display: 'User', type: 'human' as const };
  private currentAI = { 
    id: 'claude-demo', 
    display: 'Claude (Demo)', 
    type: 'ai' as const,
    model: 'claude-3-5-sonnet'
  };

  constructor() {
    const storage = new ContextStorage({
      database_name: 'chat_demo',
      auto_compact: true
    });
    
    this.chatManager = new ChatManager(storage);
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async start() {
    console.log('🤖 Nexes Chat Interface with AI Handoff Protocol');
    console.log('=' .repeat(60));
    console.log('Commands:');
    console.log('  /help     - Show this help');
    console.log('  /decision - Add a decision to the handoff tracker');
    console.log('  /handoff  - Create handoff document');
    console.log('  /export   - Export chat as ORMD document');
    console.log('  /quit     - Exit');
    console.log('=' .repeat(60));

    // Start chat session
    const session = await this.chatManager.startChatSession(
      'Demo Chat Session', 
      this.currentUser
    );
    
    console.log(`\n✅ Chat session started: ${session.title}`);
    console.log(`📝 Session ID: ${session.id.substring(0, 8)}\n`);

    // Start the chat loop
    this.chatLoop();
  }

  private chatLoop() {
    this.rl.question('You: ', async (input) => {
      try {
        await this.handleInput(input.trim());
      } catch (error) {
        console.log(`❌ Error: ${error}`);
      }
      
      // Continue the loop
      this.chatLoop();
    });
  }

  private async handleInput(input: string) {
    if (input.startsWith('/')) {
      await this.handleCommand(input);
      return;
    }

    if (input === '') {
      return;
    }

    // Add user message
    await this.chatManager.addMessage({
      sender: this.currentUser,
      content: input
    });

    // Simulate AI response
    const aiResponse = this.generateAIResponse(input);
    await this.chatManager.addMessage({
      sender: this.currentAI,
      content: aiResponse
    });

    console.log(`\n${this.currentAI.display}: ${aiResponse}\n`);
  }

  private async handleCommand(command: string) {
    const [cmd, ...args] = command.split(' ');
    
    switch (cmd) {
      case '/help':
        console.log('\n📖 Available Commands:');
        console.log('  /help     - Show this help');
        console.log('  /decision - Add a decision to the handoff tracker');
        console.log('  /handoff  - Create handoff document');
        console.log('  /export   - Export chat as ORMD document');
        console.log('  /quit     - Exit\n');
        break;

      case '/decision':
        await this.addDecision();
        break;

      case '/handoff':
        await this.createHandoff();
        break;

      case '/export':
        await this.exportChat();
        break;

      case '/quit':
        console.log('\n👋 Goodbye!');
        process.exit(0);
        break;

      default:
        console.log(`❌ Unknown command: ${cmd}. Type /help for available commands.\n`);
    }
  }

  private async addDecision() {
    return new Promise<void>((resolve) => {
      this.rl.question('Decision description: ', (description) => {
        this.rl.question('Rationale: ', (rationale) => {
          this.rl.question('Confidence (low/medium/high): ', async (confidence) => {
            try {
              const conf = confidence.toLowerCase() as 'low' | 'medium' | 'high';
              if (!['low', 'medium', 'high'].includes(conf)) {
                console.log('❌ Invalid confidence level. Using "medium".\n');
              }
              
              const decisionId = await this.chatManager.addChatDecision(
                description, 
                rationale, 
                ['low', 'medium', 'high'].includes(conf) ? conf : 'medium'
              );
              
              console.log(`✅ Decision recorded: ${decisionId.substring(0, 8)}\n`);
            } catch (error) {
              console.log(`❌ Error recording decision: ${error}\n`);
            }
            resolve();
          });
        });
      });
    });
  }

  private askQuestion(prompt: string): Promise<string> {
    return new Promise(resolve => {
      this.rl.question(prompt, answer => resolve(answer.trim()));
    });
  }

  private async createHandoff() {
    try {
      const nextAgentId = await this.askQuestion('Next agent ID: ');
      const nextAgentDisplay = await this.askQuestion('Next agent display name: ');
      const nextAgentModel = await this.askQuestion('Next agent model: ');

      const validReasons: HandoffReason[] = ['session_end', 'agent_switch', 'escalation', 'completion'];
      let selectedReason: HandoffReason | undefined;

      while (!selectedReason) {
        const reasonInput = await this.askQuestion(
          'Handoff reason (session_end/agent_switch/escalation/completion): '
        );
        const normalizedReason = reasonInput.toLowerCase() as HandoffReason;

        if (validReasons.includes(normalizedReason)) {
          selectedReason = normalizedReason;
        } else {
          console.log('❌ Invalid handoff reason. Please choose one of the listed options.');
        }
      }

      const handoffAgent: HandoffAgent = {
        id: nextAgentId || 'next-agent',
        display: nextAgentDisplay || nextAgentId || 'Next Agent',
        type: 'ai',
        ...(nextAgentModel ? { model: nextAgentModel } : {})
      };

      const displayReason = `Manual handoff to ${handoffAgent.display}`;

      const handoffId = await this.chatManager.createChatHandoff(
        handoffAgent,
        displayReason,
        selectedReason
      );

      console.log(`✅ Handoff created successfully!`);
      console.log(`📄 Handoff ID: ${handoffId.substring(0, 16)}`);
      console.log(`👤 Next agent: ${handoffAgent.display} (${handoffAgent.id})`);
      console.log(`📦 Model: ${handoffAgent.model ?? 'not specified'}`);
      console.log(`🎯 Handoff reason: ${selectedReason}`);
      console.log(`🔍 This handoff contains full context of the conversation.`);
      console.log(`🔄 Future AI agents can continue from this point.\n`);

    } catch (error) {
      console.log(`❌ Error creating handoff: ${error}\n`);
    }
  }

  private async exportChat() {
    try {
      const ormdContent = await this.chatManager.exportChatAsORMD();
      const filename = `chat-export-${Date.now()}.ormd`;
      const filePath = path.resolve(process.cwd(), filename);

      await writeFile(filePath, ormdContent, 'utf8');

      console.log(`✅ Chat exported as ORMD`);
      console.log(`💾 Saved to: ${filePath}`);
      console.log(`📄 Content preview (first 200 chars):`);
      console.log(`${ormdContent.substring(0, 200)}...\n`);

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`❌ Error exporting chat: ${message}\n`);
    }
  }

  private generateAIResponse(userInput: string): string {
    // Simple demo responses - in reality this would call an actual AI
    const responses = [
      `I understand you said: "${userInput}". As an AI agent in the Nexes system, I'm tracking our conversation context.`,
      `That's interesting! I'm documenting our discussion for future handoffs. Your input: "${userInput}" has been noted.`,
      `Thanks for that input. I'm maintaining context about our conversation so future AI agents can continue seamlessly.`,
      `I see. I'm recording key decisions and context as we chat. Would you like me to document anything specific about "${userInput}"?`,
      `Noted! Our conversation is being preserved with full context for AI handoffs. Is there a decision we should record?`
    ];

    return responses[Math.floor(Math.random() * responses.length)];
  }
}

// Start the CLI if run directly
if (require.main === module) {
  const cli = new ChatCLI();
  cli.start().catch(console.error);
}

export { ChatCLI };
