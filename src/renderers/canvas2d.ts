/**
 * Default renderer. It draws a smooth closed Catmull-Rom curve through the
 * soft-body points on a DPR-aware canvas and applies an SVG goo filter.
 */

import type { Renderer, SoftBodyState, Vec2 } from '../types';

let nextFilterId = 0;

export class Canvas2DRenderer implements Renderer {
  private canvas: HTMLCanvasElement | null = null;
  private context: CanvasRenderingContext2D | null = null;
  private gooFilter: SVGSVGElement | null = null;
  private width = 0;
  private height = 0;

  constructor(private readonly reducedMotion = false) {}

  mount(host: HTMLElement): void {
    this.destroy();

    const canvas = document.createElement('canvas');
    const filterId = `blob-goo-${nextFilterId}`;
    nextFilterId += 1;
    canvas.setAttribute('aria-hidden', 'true');
    Object.assign(canvas.style, {
      position: 'absolute',
      inset: '0',
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      filter: this.reducedMotion ? 'none' : `url(#${filterId})`,
    });

    const context = canvas.getContext('2d');
    if (context === null) {
      throw new Error('Blob could not create a Canvas 2D context.');
    }

    this.canvas = canvas;
    this.context = context;
    if (!this.reducedMotion) {
      this.gooFilter = this.createGooFilter(filterId);
      host.append(this.gooFilter);
    }
    host.append(canvas);
    this.resize();
  }

  render(body: SoftBodyState): void {
    if (this.context === null) {
      return;
    }

    const { context, width, height } = this;
    context.clearRect(0, 0, width, height);
    if (body.points.length < 3) {
      return;
    }

    this.traceClosedCurve(context, body.points);
    if (body.shape === 'ring') {
      context.lineCap = body.strokeLineCap ?? 'round';
      context.lineJoin = body.strokeLineJoin ?? 'round';
      context.lineWidth = body.strokeWidth;
      context.strokeStyle = body.strokeColor ?? body.color;
      context.stroke();
      return;
    }
    context.fillStyle = body.color;
    context.fill();
  }

  destroy(): void {
    this.canvas?.remove();
    this.gooFilter?.remove();
    this.canvas = null;
    this.context = null;
    this.gooFilter = null;
    this.width = 0;
    this.height = 0;
  }

  resize(): void {
    if (this.canvas === null || this.context === null) {
      return;
    }

    const dpr = Math.max(window.devicePixelRatio || 1, 1);
    this.width = this.canvas.clientWidth || document.documentElement.clientWidth || window.innerWidth;
    this.height = this.canvas.clientHeight || document.documentElement.clientHeight || window.innerHeight;
    this.canvas.width = Math.round(this.width * dpr);
    this.canvas.height = Math.round(this.height * dpr);
    this.context.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private createGooFilter(id: string): SVGSVGElement {
    const namespace = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(namespace, 'svg');
    const filter = document.createElementNS(namespace, 'filter');
    const blur = document.createElementNS(namespace, 'feGaussianBlur');
    const threshold = document.createElementNS(namespace, 'feColorMatrix');

    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('width', '0');
    svg.setAttribute('height', '0');
    svg.style.position = 'absolute';
    filter.setAttribute('id', id);
    blur.setAttribute('in', 'SourceGraphic');
    blur.setAttribute('stdDeviation', '1.2');
    blur.setAttribute('result', 'blurred');
    threshold.setAttribute('in', 'blurred');
    threshold.setAttribute('type', 'matrix');
    threshold.setAttribute('values', '1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 18 -7');
    filter.append(blur, threshold);
    svg.append(filter);
    return svg;
  }

  private traceClosedCurve(context: CanvasRenderingContext2D, points: readonly Vec2[]): void {
    const count = points.length;
    const first = points[0]!;
    context.beginPath();
    context.moveTo(first.x, first.y);

    for (let index = 0; index < count; index += 1) {
      const previous = points[(index - 1 + count) % count]!;
      const current = points[index]!;
      const next = points[(index + 1) % count]!;
      const afterNext = points[(index + 2) % count]!;
      const firstControl = {
        x: current.x + (next.x - previous.x) / 6,
        y: current.y + (next.y - previous.y) / 6,
      };
      const secondControl = {
        x: next.x - (afterNext.x - current.x) / 6,
        y: next.y - (afterNext.y - current.y) / 6,
      };

      context.bezierCurveTo(
        firstControl.x,
        firstControl.y,
        secondControl.x,
        secondControl.y,
        next.x,
        next.y,
      );
    }

    context.closePath();
  }
}
