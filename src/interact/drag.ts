import type { Vec2 } from '../types';

export class DragBehavior {
  private target: HTMLElement | null = null;
  private pointerId: number | null = null;

  constructor(
    private readonly onStart: () => boolean,
    private readonly onMove: (point: Vec2) => void,
    private readonly onEnd: () => void,
  ) {}

  enable(target: HTMLElement): void {
    this.disable();
    this.target = target;
    target.addEventListener('pointerdown', this.handleDown);
    target.addEventListener('pointermove', this.handleMove);
    target.addEventListener('pointerup', this.handleEnd);
    target.addEventListener('pointercancel', this.handleEnd);
  }

  disable(): void {
    this.target?.removeEventListener('pointerdown', this.handleDown);
    this.target?.removeEventListener('pointermove', this.handleMove);
    this.target?.removeEventListener('pointerup', this.handleEnd);
    this.target?.removeEventListener('pointercancel', this.handleEnd);
    this.target = null;
    this.pointerId = null;
  }

  private readonly handleDown = (event: PointerEvent): void => {
    if (!this.onStart()) return;
    this.pointerId = event.pointerId;
    this.target?.setPointerCapture(event.pointerId);
    this.onMove({ x: event.clientX, y: event.clientY });
  };

  private readonly handleMove = (event: PointerEvent): void => {
    if (event.pointerId === this.pointerId) this.onMove({ x: event.clientX, y: event.clientY });
  };

  private readonly handleEnd = (event: PointerEvent): void => {
    if (event.pointerId !== this.pointerId) return;
    this.target?.releasePointerCapture(event.pointerId);
    this.pointerId = null;
    this.onEnd();
  };
}
