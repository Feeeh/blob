/** Tracks an attachment target through layout, scrolling, and DOM removal. */

import type { BlobAttachmentSide, Vec2 } from '../types';

export interface AnchorCallbacks {
  onRect(rect: DOMRectReadOnly): void;
  onLost(): void;
}

/** Resolve an attachment target without allowing a malformed selector to throw. */
export function resolveAnchor(target: string | HTMLElement): HTMLElement | null {
  if (typeof target !== 'string') {
    return target;
  }

  try {
    return document.querySelector<HTMLElement>(target);
  } catch {
    return null;
  }
}

/** Center a Blob just outside the nearest edge of a target rectangle. */
export function attachmentPoint(
  rect: DOMRectReadOnly,
  reference: Vec2,
  radius: number,
  side: BlobAttachmentSide = 'nearest',
): Vec2 {
  if (side !== 'nearest') {
    return attachmentPointOnSide(rect, reference, radius, side);
  }
  const closest = {
    x: clamp(reference.x, rect.left, rect.right),
    y: clamp(reference.y, rect.top, rect.bottom),
  };
  let direction = { x: reference.x - closest.x, y: reference.y - closest.y };

  if (direction.x === 0 && direction.y === 0) {
    const distances = [
      { distance: reference.x - rect.left, direction: { x: -1, y: 0 }, point: { x: rect.left, y: reference.y } },
      { distance: rect.right - reference.x, direction: { x: 1, y: 0 }, point: { x: rect.right, y: reference.y } },
      { distance: reference.y - rect.top, direction: { x: 0, y: -1 }, point: { x: reference.x, y: rect.top } },
      { distance: rect.bottom - reference.y, direction: { x: 0, y: 1 }, point: { x: reference.x, y: rect.bottom } },
    ];
    const nearest = distances.reduce((current, candidate) => (
      candidate.distance < current.distance ? candidate : current
    ));
    closest.x = nearest.point.x;
    closest.y = nearest.point.y;
    direction = nearest.direction;
  }

  const length = Math.hypot(direction.x, direction.y);
  return {
    x: closest.x + direction.x / length * radius,
    y: closest.y + direction.y / length * radius,
  };
}

function attachmentPointOnSide(
  rect: DOMRectReadOnly,
  reference: Vec2,
  radius: number,
  side: Exclude<BlobAttachmentSide, 'nearest'>,
): Vec2 {
  if (side === 'top') return { x: clamp(reference.x, rect.left, rect.right), y: rect.top - radius };
  if (side === 'right') return { x: rect.right + radius, y: clamp(reference.y, rect.top, rect.bottom) };
  if (side === 'bottom') return { x: clamp(reference.x, rect.left, rect.right), y: rect.bottom + radius };
  return { x: rect.left - radius, y: clamp(reference.y, rect.top, rect.bottom) };
}

export class Anchor {
  private observer: ResizeObserver | null = null;
  private mutationObserver: MutationObserver | null = null;
  private frame: number | null = null;
  private active = false;

  constructor(
    private readonly element: HTMLElement,
    private readonly callbacks: AnchorCallbacks,
  ) {}

  static resolve(target: string | HTMLElement): HTMLElement | null {
    return resolveAnchor(target);
  }

  start(): void {
    this.stop();
    this.active = true;
    if (typeof ResizeObserver !== 'undefined') {
      this.observer = new ResizeObserver(this.schedule);
      this.observer.observe(this.element);
    }
    if (typeof MutationObserver !== 'undefined') {
      this.mutationObserver = new MutationObserver(this.schedule);
      this.mutationObserver.observe(document.documentElement, { childList: true, subtree: true });
    }
    window.addEventListener('scroll', this.schedule, true);
    window.addEventListener('resize', this.schedule);
    this.sample();
  }

  stop(): void {
    this.active = false;
    if (this.frame !== null) {
      window.cancelAnimationFrame(this.frame);
      this.frame = null;
    }
    this.observer?.disconnect();
    this.observer = null;
    this.mutationObserver?.disconnect();
    this.mutationObserver = null;
    window.removeEventListener('scroll', this.schedule, true);
    window.removeEventListener('resize', this.schedule);
  }

  private readonly sample = (): void => {
    if (!this.active) {
      return;
    }
    if (!this.element.isConnected) {
      this.callbacks.onLost();
      this.stop();
      return;
    }

    this.callbacks.onRect(this.element.getBoundingClientRect());
  };

  private readonly schedule = (): void => {
    if (!this.active || this.frame !== null) {
      return;
    }
    this.frame = window.requestAnimationFrame(this.onFrame);
  };

  private readonly onFrame = (): void => {
    this.frame = null;
    this.sample();
  };
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}
