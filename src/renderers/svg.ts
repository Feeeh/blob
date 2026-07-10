import type { Renderer, SoftBodyState, Vec2 } from '../types';

export class SvgRenderer implements Renderer {
  private svg: SVGSVGElement | null = null;
  private path: SVGPathElement | null = null;

  mount(host: HTMLElement): void {
    this.destroy();
    const namespace = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(namespace, 'svg');
    const path = document.createElementNS(namespace, 'path');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('viewBox', `0 0 ${window.innerWidth} ${window.innerHeight}`);
    Object.assign(svg.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', pointerEvents: 'none' });
    svg.append(path);
    host.append(svg);
    this.svg = svg;
    this.path = path;
  }

  render(body: SoftBodyState): void {
    if (this.path === null || body.points.length < 3) return;
    this.path.setAttribute('d', smoothPath(body.points));
    this.path.setAttribute('fill', body.shape === 'ring' ? 'none' : body.color);
    this.path.setAttribute('stroke', body.shape === 'ring' ? body.strokeColor ?? body.color : 'none');
    this.path.setAttribute('stroke-width', String(body.shape === 'ring' ? body.strokeWidth : 0));
    this.path.setAttribute('stroke-linecap', body.strokeLineCap ?? 'round');
    this.path.setAttribute('stroke-linejoin', body.strokeLineJoin ?? 'round');
  }

  resize(): void { this.svg?.setAttribute('viewBox', `0 0 ${window.innerWidth} ${window.innerHeight}`); }

  destroy(): void { this.svg?.remove(); this.svg = null; this.path = null; }
}

function smoothPath(points: readonly Vec2[]): string {
  const count = points.length;
  let path = `M ${points[0]!.x} ${points[0]!.y}`;
  for (let index = 0; index < count; index += 1) {
    const previous = points[(index - 1 + count) % count]!;
    const current = points[index]!;
    const next = points[(index + 1) % count]!;
    const afterNext = points[(index + 2) % count]!;
    path += ` C ${current.x + (next.x - previous.x) / 6} ${current.y + (next.y - previous.y) / 6}`;
    path += ` ${next.x - (afterNext.x - current.x) / 6} ${next.y - (afterNext.y - current.y) / 6}`;
    path += ` ${next.x} ${next.y}`;
  }
  return `${path} Z`;
}
