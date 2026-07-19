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
    if (body.shape === 'ring' && body.points.length > 0) {
      // Draw the ring as a hollow bordered box over the points' bounding box,
      // so circle() highlights the target instead of covering it.
      const xs = body.points.map((point) => point.x);
      const ys = body.points.map((point) => point.y);
      const left = Math.min(...xs);
      const top = Math.min(...ys);
      const stroke = body.strokeWidth;
      Object.assign(this.element.style, {
        left: `${left - stroke / 2}px`, top: `${top - stroke / 2}px`,
        width: `${Math.max(...xs) - left + stroke}px`, height: `${Math.max(...ys) - top + stroke}px`,
        boxSizing: 'border-box',
        background: 'transparent',
        border: `${stroke}px solid ${body.strokeColor ?? body.color}`,
        borderRadius: body.morphShape === 'circle'
          ? '50%'
          : body.morphShape === 'rounded' ? `${body.morphRadius ?? 24}px` : '0',
      });
      return;
    }
    const radius = Math.max(...body.points.map((point) => Math.hypot(point.x - body.center.x, point.y - body.center.y)), 1);
    Object.assign(this.element.style, {
      left: `${body.center.x - radius}px`, top: `${body.center.y - radius}px`, width: `${radius * 2}px`, height: `${radius * 2}px`,
      background: body.color, border: '0', borderRadius: '50%',
    });
  }

  destroy(): void { this.element?.remove(); this.element = null; }
}
