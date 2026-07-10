import type { Renderer, SoftBodyState } from '../types';

export class CssRenderer implements Renderer {
  private element: HTMLDivElement | null = null;

  mount(host: HTMLElement): void {
    this.destroy();
    const element = document.createElement('div');
    element.setAttribute('aria-hidden', 'true');
    Object.assign(element.style, { position: 'fixed', pointerEvents: 'none', borderRadius: '50%', transition: 'width 120ms, height 120ms' });
    host.append(element);
    this.element = element;
  }

  render(body: SoftBodyState): void {
    if (this.element === null) return;
    const radius = Math.max(...body.points.map((point) => Math.hypot(point.x - body.center.x, point.y - body.center.y)), 1);
    Object.assign(this.element.style, {
      left: `${body.center.x - radius}px`, top: `${body.center.y - radius}px`, width: `${radius * 2}px`, height: `${radius * 2}px`,
      background: body.color, borderRadius: body.shape === 'ring' ? '35%' : '50%',
    });
  }

  destroy(): void { this.element?.remove(); this.element = null; }
}
