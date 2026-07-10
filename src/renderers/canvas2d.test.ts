import { afterEach, describe, expect, it, vi } from 'vitest';
import { Canvas2DRenderer } from './canvas2d';

function installCanvasEnvironment(): {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  host: HTMLElement;
  svgElement: SVGSVGElement;
} {
  const context = {
    clearRect: vi.fn(),
    setTransform: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    bezierCurveTo: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    fillStyle: '',
    stroke: vi.fn(),
    strokeStyle: '',
  } as unknown as CanvasRenderingContext2D;
  const canvas = {
    style: {},
    width: 0,
    height: 0,
    clientWidth: 800,
    clientHeight: 600,
    setAttribute: vi.fn(),
    getContext: vi.fn(() => context),
    remove: vi.fn(),
  } as unknown as HTMLCanvasElement;
  const svgElement = {
    style: {},
    append: vi.fn(),
    remove: vi.fn(),
    setAttribute: vi.fn(),
  } as unknown as SVGSVGElement;
  const host = { append: vi.fn() } as unknown as HTMLElement;

  vi.stubGlobal('document', {
    createElement: vi.fn(() => canvas),
    createElementNS: vi.fn(() => svgElement),
    documentElement: { clientWidth: 800, clientHeight: 600 },
  });
  vi.stubGlobal('window', {
    innerWidth: 800,
    innerHeight: 600,
    devicePixelRatio: 2,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });

  return { canvas, context, host, svgElement };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Canvas2DRenderer', () => {
  it('sizes its canvas for DPR and draws a closed smooth curve', () => {
    const { canvas, context, host, svgElement } = installCanvasEnvironment();
    const renderer = new Canvas2DRenderer();

    renderer.mount(host);
    renderer.render({
      center: { x: 50, y: 50 },
      points: [
        { x: 40, y: 40 },
        { x: 60, y: 40 },
        { x: 50, y: 60 },
      ],
      color: '#8b5cf6',
      shape: 'solid',
      strokeWidth: 12,
    });

    expect(canvas.width).toBe(1600);
    expect(canvas.height).toBe(1200);
    expect(context.setTransform).toHaveBeenCalledWith(2, 0, 0, 2, 0, 0);
    expect(context.bezierCurveTo).toHaveBeenCalledTimes(3);
    expect(context.closePath).toHaveBeenCalledOnce();
    expect(context.fillStyle).toBe('#8b5cf6');
    expect(context.fill).toHaveBeenCalledOnce();
    expect(host.append).toHaveBeenCalledTimes(2);
    expect(canvas.style.filter).toMatch(/^url\(#blob-goo-\d+\)$/);
    renderer.destroy();
    expect(svgElement.remove).toHaveBeenCalledOnce();
  });

  it('skips invalid paths and cleans up idempotently', () => {
    const { canvas, context, host } = installCanvasEnvironment();
    const renderer = new Canvas2DRenderer(true);

    renderer.mount(host);
    renderer.render({
      center: { x: 0, y: 0 },
      points: [],
      color: '#8b5cf6',
      shape: 'solid',
      strokeWidth: 12,
    });
    renderer.destroy();
    renderer.destroy();

    expect(context.fill).not.toHaveBeenCalled();
    expect(canvas.remove).toHaveBeenCalledOnce();
    expect(host.append).toHaveBeenCalledOnce();
    expect(canvas.style.filter).toBe('none');
  });

  it('strokes a ring instead of filling over the target', () => {
    const { context, host } = installCanvasEnvironment();
    const renderer = new Canvas2DRenderer(true);

    renderer.mount(host);
    renderer.render({
      center: { x: 50, y: 50 },
      points: [{ x: 30, y: 30 }, { x: 70, y: 30 }, { x: 70, y: 70 }, { x: 30, y: 70 }],
      color: '#8b5cf6',
      shape: 'ring',
      strokeWidth: 14,
    });

    expect(context.strokeStyle).toBe('#8b5cf6');
    expect(context.lineWidth).toBe(14);
    expect(context.stroke).toHaveBeenCalledOnce();
    expect(context.fill).not.toHaveBeenCalled();
  });
});
