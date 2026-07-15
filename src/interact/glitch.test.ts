import { afterEach, describe, expect, it, vi } from 'vitest';
import { GlitchBehavior } from './glitch';

function fakeElement(): HTMLElement {
  const classes = new Set<string>();
  return {
    classList: {
      add: (...tokens: string[]) => tokens.forEach((token) => classes.add(token)),
      contains: (token: string) => classes.has(token),
      remove: (...tokens: string[]) => tokens.forEach((token) => classes.delete(token)),
    },
  } as unknown as HTMLElement;
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('GlitchBehavior', () => {
  it('waits before a burst, then removes the class when it ends', () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const element = fakeElement();
    const behavior = new GlitchBehavior();

    behavior.enable(element);
    expect(element.classList.contains('blob-glitch')).toBe(false);
    vi.advanceTimersByTime(1999);
    expect(element.classList.contains('blob-glitch')).toBe(false);
    vi.advanceTimersByTime(1);
    expect(element.classList.contains('blob-glitch')).toBe(true);
    vi.advanceTimersByTime(120);
    expect(element.classList.contains('blob-glitch')).toBe(false);

    behavior.disable();
  });

  it('cancels a burst cleanly when disabled', () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const element = fakeElement();
    const behavior = new GlitchBehavior();

    behavior.enable(element);
    vi.advanceTimersByTime(2000);
    expect(element.classList.contains('blob-glitch')).toBe(true);
    behavior.disable();
    vi.runAllTimers();

    expect(element.classList.contains('blob-glitch')).toBe(false);
  });
});
