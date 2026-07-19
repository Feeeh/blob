import { afterEach, describe, expect, it, vi } from 'vitest';
import { SpeechBubble } from './bubble';

interface BubbleEnvironment {
  elements: HTMLElement[];
  handlers: Map<string, EventListener>;
  host: HTMLElement;
}

function installBubbleEnvironment(): BubbleEnvironment {
  const elements: HTMLElement[] = [];
  const handlers = new Map<string, EventListener>();
  const host = { append: vi.fn() } as unknown as HTMLElement;

  vi.stubGlobal('document', {
    createElement: vi.fn(() => {
      const element = {
        className: '',
        hidden: false,
        textContent: '',
        offsetWidth: 100,
        offsetHeight: 48,
        style: { setProperty: vi.fn() },
        append: vi.fn(),
        addEventListener: vi.fn((event: string, handler: EventListener) => {
          handlers.set(event, handler);
        }),
        removeEventListener: vi.fn(),
        remove: vi.fn(),
        setAttribute: vi.fn(),
      } as unknown as HTMLElement;
      elements.push(element);
      return element;
    }),
    documentElement: { clientWidth: 320, clientHeight: 200 },
  });
  vi.stubGlobal('window', { innerWidth: 320, innerHeight: 200 });

  return { elements, handlers, host };
}

function rect(left: number, top: number, width: number, height: number): DOMRectReadOnly {
  return {
    bottom: top + height,
    height,
    left,
    right: left + width,
    top,
    width,
  } as DOMRectReadOnly;
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('SpeechBubble', () => {
  it('mirrors complete speech to aria-live, flips below the body, and advances on clicks', async () => {
    vi.useFakeTimers();
    const { elements, handlers, host } = installBubbleEnvironment();
    const bubble = new SpeechBubble({ characterDelay: 10 });
    bubble.mount(host);
    bubble.follow(rect(10, 4, 50, 20));

    const done = bubble.say('hi');
    const [element, text, liveRegion] = elements;
    const click = handlers.get('click');

    expect(element?.hidden).toBe(false);
    expect((element as HTMLButtonElement | undefined)?.type).toBe('button');
    expect(liveRegion?.textContent).toBe('hi');
    expect(element?.className).toBe('blob-bubble blob-bubble--below');
    expect(element?.style.left).toBe('8px');
    expect(element?.style.top).toBe('40px');
    vi.advanceTimersByTime(10);
    expect(text?.textContent).toBe('h');
    click?.(new Event('click'));
    expect(text?.textContent).toBe('hi');
    click?.(new Event('click'));
    await done;
    expect(element?.hidden).toBe(true);
  });

  it('does not hide a newer speech line when an older line is replaced', async () => {
    const { elements, handlers, host } = installBubbleEnvironment();
    const bubble = new SpeechBubble({ reducedMotion: true });
    bubble.mount(host);
    bubble.follow(rect(100, 100, 40, 40));

    const first = bubble.say('first');
    const second = bubble.say('second');
    await first;

    expect(elements[0]?.hidden).toBe(false);
    handlers.get('click')?.(new Event('click'));
    await second;
    expect(elements[0]?.hidden).toBe(true);
  });

  it('locks the bubble to the full line size so typing never moves it', () => {
    vi.useFakeTimers();
    const { elements, host } = installBubbleEnvironment();
    const bubble = new SpeechBubble({ characterDelay: 10 });
    bubble.mount(host);
    bubble.follow(rect(140, 100, 40, 40));
    const element = elements[0]! as HTMLElement & { style: { minWidth?: string; minHeight?: string } };

    void bubble.say('hi');
    // Measured once with the complete text, before the first character shows.
    expect(element.style.minWidth).toBe('100px');
    expect(element.style.minHeight).toBe('48px');
    expect(element.style.left).toBe('110px');

    // Even if the element reports a new size mid-line, the position holds.
    Object.defineProperty(element, 'offsetWidth', { configurable: true, value: 200 });
    vi.advanceTimersByTime(10);
    expect(element.style.left).toBe('110px');
  });

  it('automatically advances a line when configured', async () => {
    vi.useFakeTimers();
    const { elements, host } = installBubbleEnvironment();
    const bubble = new SpeechBubble({ autoAdvance: 20, characterDelay: 0, reducedMotion: true });
    bubble.mount(host);
    bubble.follow(rect(100, 100, 40, 40));

    const done = bubble.say('next');
    vi.advanceTimersByTime(20);
    await done;

    expect(elements[0]?.hidden).toBe(true);
  });

  it('starts the auto-advance dwell only after typing actually completes', async () => {
    vi.useFakeTimers();
    const { elements, host } = installBubbleEnvironment();
    const bubble = new SpeechBubble({ autoAdvance: 30, characterDelay: 10 });
    bubble.mount(host);
    bubble.follow(rect(100, 100, 40, 40));

    const done = bubble.say('hi');
    vi.advanceTimersByTime(20);
    await Promise.resolve();
    expect(elements[1]?.textContent).toBe('hi');
    expect(elements[0]?.hidden).toBe(false);

    vi.advanceTimersByTime(30);
    await done;
    expect(elements[0]?.hidden).toBe(true);
  });

  it('holds a reduced-motion line long enough to read, scaled by its length', async () => {
    vi.useFakeTimers();
    const { elements, host } = installBubbleEnvironment();
    const bubble = new SpeechBubble({ autoAdvance: 20, characterDelay: 10, reducedMotion: true });
    bubble.mount(host);
    bubble.follow(rect(100, 100, 40, 40));

    // 'next' is 4 code points → dwell = 4 * 10 + 20 = 60ms, not a flat 20ms.
    const done = bubble.say('next');
    vi.advanceTimersByTime(20);
    await Promise.resolve();
    expect(elements[0]?.hidden).toBe(false);

    vi.advanceTimersByTime(40);
    await done;
    expect(elements[0]?.hidden).toBe(true);
  });
});
