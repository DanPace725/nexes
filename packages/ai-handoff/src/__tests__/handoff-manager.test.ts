import { HandoffManager } from '../handoff-manager';
import { HandoffAgent } from '../types';

describe('HandoffManager', () => {
  class InMemoryContextStorage {
    private bundles = new Map<string, any>();

    async store(bundle: any): Promise<any> {
      const stored = {
        ...bundle,
        _id: bundle.id,
        indexed_at: new Date().toISOString(),
        search_text: '',
        tags: []
      };

      this.bundles.set(bundle.id, stored);
      return stored;
    }

    async get(id: string): Promise<any | null> {
      return this.bundles.get(id) ?? null;
    }

    getStored(id: string): any | undefined {
      return this.bundles.get(id);
    }
  }

  const createAgent = (id: string, display: string): HandoffAgent => ({
    id,
    display,
    type: 'ai'
  });

  it('preserves context through handoff lifecycle', async () => {
    const storage = new InMemoryContextStorage();
    const manager = new HandoffManager(storage as unknown as any);

    const primaryAgent = createAgent('agent-primary', 'Primary Agent');
    const followupAgent = createAgent('agent-followup', 'Follow-up Agent');

    const session = await manager.startSession(primaryAgent);
    expect(session.context.session_id).toBeDefined();

    manager.updateContext({
      summary: 'Coordinate multi-agent collaboration',
      recommended_next_steps: ['Review shared context bundle'],
      context_notes: 'Ensure JSON context remains attached to markdown.'
    });

    expect(manager.getCurrentSession()?.context.summary).toBe('Coordinate multi-agent collaboration');

    const handoffId = await manager.createHandoff(followupAgent, 'agent_switch');
    expect(manager.getCurrentSession()?.status).toBe('completed');

    const storedBundle = storage.getStored(handoffId);
    expect(storedBundle).toBeDefined();
    expect(storedBundle?.content.type).toBe('text/markdown');

    const rawContent = storedBundle!.content.data;
    expect(rawContent).toContain('<!-- HANDOFF_CONTEXT -->');

    const embeddedJson = rawContent
      .split('<!-- HANDOFF_CONTEXT -->')[1]
      .split('<!-- /HANDOFF_CONTEXT -->')[0]
      .trim();

    const parsedContext = JSON.parse(embeddedJson);
    expect(parsedContext.summary).toBe('Coordinate multi-agent collaboration');
    expect(parsedContext.recommended_next_steps).toContain('Review shared context bundle');
    expect(parsedContext.context_notes).toContain('Ensure JSON context remains attached');

    const loaded = await manager.loadHandoff(handoffId);
    expect(loaded.handoff_context.summary).toBe('Coordinate multi-agent collaboration');
    expect(loaded.frontmatter.handoff.to_agent).toBe(followupAgent.id);
  });
});
