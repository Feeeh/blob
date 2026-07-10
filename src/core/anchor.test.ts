import { afterEach, describe, expect, it, vi } from 'vitest';
import { Anchor, attachmentPoint, resolveAnchor } from './anchor';

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
  vi.unstubAllGlobals();
});

describe('attachmentPoint', () => {
  it('positions Blob outside the nearest target edge', () => {
    const target = rect(100, 100, 200, 100);

    expect(attachmentPoint(target, { x: 400, y: 150 }, 10)).toEqual({ x: 310, y: 150 });
    expect(attachmentPoint(target, { x: 150, y: 150 }, 10)).toEqual({ x: 90, y: 150 });
  });
});

describe('Anchor', () => {
  it('samples through rAF and detaches when the target leaves the DOM', () => {
    let frame: FrameRequestCallback = () => {
      throw new Error('Anchor did not request an animation frame.');
    };
    let scrollListener: () => void = () => {
      throw new Error('Anchor did not register a scroll listener.');
    };
    const observer = {
      observe: vi.fn(),
      disconnect: vi.fn(),
    };
    const ResizeObserverMock = vi.fn(() => observer);
    const rawElement = {
      isConnected: true,
      getBoundingClientRect: vi.fn(() => rect(10, 20, 30, 40)),
    };
    const element = rawElement as unknown as HTMLElement;
    const onRect = vi.fn();
    const onLost = vi.fn();

    vi.stubGlobal('ResizeObserver', ResizeObserverMock);
    vi.stubGlobal('window', {
      addEventListener: vi.fn((event: string, handler: EventListener) => {
        if (event === 'scroll') {
          scrollListener = handler as unknown as () => void;
        }
      }),
      removeEventListener: vi.fn(),
      requestAnimationFrame: vi.fn((callback: FrameRequestCallback) => {
        frame = callback;
        return 1;
      }),
      cancelAnimationFrame: vi.fn(),
    });

    const anchor = new Anchor(element, { onRect, onLost });
    anchor.start();
    scrollListener();
    frame(16);
    rawElement.isConnected = false;
    scrollListener();
    frame(32);

    expect(onRect).toHaveBeenCalledTimes(2);
    expect(onLost).toHaveBeenCalledOnce();
    expect(observer.observe).toHaveBeenCalledWith(element);
    expect(observer.disconnect).toHaveBeenCalledOnce();
  });

  it('returns null for a malformed selector', () => {
    vi.stubGlobal('document', {
      querySelector: vi.fn(() => {
        throw new DOMException('Invalid selector');
      }),
    });

    expect(resolveAnchor('[')).toBeNull();
  });
});
