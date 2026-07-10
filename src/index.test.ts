import { afterEach, describe, expect, it, vi } from 'vitest';
import { createBlob, defineBlobCharacter } from './index';
import type { Renderer, SoftBodyState } from './types';

interface FakeElement {
  className: string;
  hidden: boolean;
  isConnected: boolean;
  offsetHeight: number;
  offsetWidth: number;
  style: { setProperty: ReturnType<typeof vi.fn> };
  textContent: string | null;
  type: string;
  addEventListener: ReturnType<typeof vi.fn>;
  append: ReturnType<typeof vi.fn>;
  getBoundingClientRect: ReturnType<typeof vi.fn>;
  remove: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
  setAttribute: ReturnType<typeof vi.fn>;
}

function installDom(): {
  target: FakeElement;
  runAnchorFrame: (time: number) => void;
  triggerScroll: () => void;
} {
  let frame: FrameRequestCallback = () => {
    throw new Error('Anchor did not schedule a frame.');
  };
  let scrollListener: () => void = () => {
    throw new Error('Anchor did not register a scroll listener.');
  };
  const createElement = (): FakeElement => ({
    addEventListener: vi.fn(),
    append: vi.fn(),
    className: '',
    getBoundingClientRect: vi.fn(() => ({
      bottom: 80,
      height: 40,
      left: 20,
      right: 180,
      top: 40,
      width: 160,
    })),
    hidden: false,
    isConnected: true,
    offsetHeight: 48,
    offsetWidth: 120,
    remove: vi.fn(),
    removeEventListener: vi.fn(),
    setAttribute: vi.fn(),
    style: { setProperty: vi.fn() },
    textContent: '',
    type: '',
  });
  const target = createElement();
  const body = createElement();
  const head = {
    append: vi.fn(),
    querySelector: vi.fn(() => null),
  };

  vi.stubGlobal('document', {
    addEventListener: vi.fn(),
    body,
    createElement: vi.fn(() => createElement()),
    documentElement: { clientHeight: 600, clientWidth: 800 },
    head,
    querySelectorAll: vi.fn(() => []),
    removeEventListener: vi.fn(),
    visibilityState: 'visible',
  });
  vi.stubGlobal('window', {
    addEventListener: vi.fn((event: string, handler: EventListener) => {
      if (event === 'scroll') {
        scrollListener = handler as unknown as () => void;
      }
    }),
    cancelAnimationFrame: vi.fn(),
    devicePixelRatio: 1,
    innerHeight: 600,
    innerWidth: 800,
    matchMedia: vi.fn(() => ({ matches: true })),
    removeEventListener: vi.fn(),
    requestAnimationFrame: vi.fn((callback: FrameRequestCallback) => {
      frame = callback;
      return 1;
    }),
  });

  return {
    target,
    runAnchorFrame: (time) => frame(time),
    triggerScroll: () => scrollListener(),
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createBlob movement controls', () => {
  it('moves, attaches, detaches on target loss, and cleans up in reduced motion', () => {
    const { target, runAnchorFrame, triggerScroll } = installDom();
    const frames: SoftBodyState[] = [];
    const renderer: Renderer = {
      destroy: vi.fn(),
      mount: vi.fn(),
      render: vi.fn((body: SoftBodyState) => frames.push(body)),
    };
    const blob = createBlob({ renderer, respectReducedMotion: true, size: 20 });
    const warnings: string[] = [];
    const detach = vi.fn();
    const attach = vi.fn();
    const circle = vi.fn();
    blob.on('warn', (message) => warnings.push(message));
    blob.on('detach', detach);
    blob.on('attach', attach);
    blob.on('circle', circle);

    blob.moveTo({ x: 300, y: 400 });
    expect(frames.at(-1)?.center).toEqual({ x: 300, y: 400 });

    blob.attachTo(target as unknown as HTMLElement);
    expect(attach).toHaveBeenCalledWith(target);
    expect(frames.at(-1)?.center.x).toBeCloseTo(187.02, 1);
    expect(frames.at(-1)?.center.y).toBeCloseTo(98.73, 1);

    blob.circle(target as unknown as HTMLElement);
    expect(circle).toHaveBeenCalledWith(target);
    expect(frames.at(-1)?.shape).toBe('ring');

    target.isConnected = false;
    triggerScroll();
    runAnchorFrame(16);
    expect(warnings).toEqual(['Blob detached because its circle target is no longer available.']);
    expect(detach).toHaveBeenCalledOnce();
    expect(frames.at(-1)?.center).toEqual({ x: 764, y: 564 });

    blob.destroy();
    expect(renderer.destroy).toHaveBeenCalledOnce();
  });

  it('runs a character script and applies its morph settings', () => {
    const { target } = installDom();
    const frames: SoftBodyState[] = [];
    const cleanup = vi.fn();
    const character = defineBlobCharacter({
      bubble: false,
      physics: false,
      body: { color: '#f97316', points: 12, size: 20 },
      morph: { shape: 'square', strokeColor: '#0f172a', strokeWidth: 5 },
      script: () => cleanup,
    });
    const blob = createBlob({
      ...character,
      renderer: {
        destroy: vi.fn(),
        mount: vi.fn(),
        render: vi.fn((body: SoftBodyState) => frames.push(body)),
      },
    });

    blob.circle(target as unknown as HTMLElement);

    const frame = frames.at(-1)!;
    expect(frame).toMatchObject({
      color: '#f97316',
      shape: 'ring',
      morphShape: 'square',
      strokeColor: '#0f172a',
      strokeWidth: 5,
    });
    const width = Math.max(...frame.points.map((point) => point.x)) - Math.min(...frame.points.map((point) => point.x));
    const height = Math.max(...frame.points.map((point) => point.y)) - Math.min(...frame.points.map((point) => point.y));
    expect(width).toBeCloseTo(height);
    blob.destroy();
    expect(cleanup).toHaveBeenCalledOnce();
  });
});
