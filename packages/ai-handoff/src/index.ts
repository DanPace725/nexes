/**
 * @nexes/ai-handoff
 * AI handoff protocol for seamless context preservation across sessions
 */

export * from './types';
export * from './handoff-manager';

// Re-export main class as default
export { HandoffManager as default } from './handoff-manager';
