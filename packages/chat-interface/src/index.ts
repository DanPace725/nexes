/**
 * @nexes/chat-interface
 * Basic chat interface with AI handoff protocol integration
 */

export * from './chat-manager';
export * from './cli';

// Re-export main class as default
export { ChatManager as default } from './chat-manager';
