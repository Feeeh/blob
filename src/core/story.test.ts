import { describe, expect, it, vi } from 'vitest';
import { StoryEngine, type StoryHost } from './story';

describe('StoryEngine', () => {
  it('runs each combined step in documented order', async () => {
    const calls: string[] = [];
    const host: StoryHost = {
      sleep: async (ms) => { calls.push(`sleep:${ms}`); },
      moveTo: async (x, y) => { calls.push(`move:${x},${y}`); },
      attachTo: async () => { calls.push('attach'); },
      circle: async () => { calls.push('circle'); },
      say: async (text) => { calls.push(`say:${text}`); },
      detach: async () => { calls.push('detach'); },
      onStep: () => calls.push('step'),
      onEnd: () => calls.push('end'),
    };
    const engine = new StoryEngine(host, [{ sleep: 1, moveTo: { x: 2, y: 3 }, attachTo: '#a', circle: '#b', say: 'Hi', detach: true }]);

    await engine.play();

    expect(calls).toEqual(['step', 'sleep:1', 'move:2,3', 'attach', 'circle', 'say:Hi', 'detach', 'end']);
  });

  it('skips an active speech line and does not run following steps', async () => {
    let resolveSpeech: (() => void) | null = null;
    const detach = vi.fn();
    const skipSpeech = vi.fn(() => resolveSpeech?.());
    const engine = new StoryEngine({
      sleep: async () => {},
      say: () => new Promise((resolve) => { resolveSpeech = resolve; }),
      moveTo: async () => {}, attachTo: async () => {}, circle: async () => {}, detach,
      skipSpeech,
    }, [{ say: 'Wait', detach: true }, { detach: true }]);

    const playing = engine.play();
    await Promise.resolve();
    engine.skip();
    await playing;

    expect(skipSpeech).toHaveBeenCalledOnce();
    expect(detach).not.toHaveBeenCalled();
  });
});
