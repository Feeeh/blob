/**
 * Blob's body state machine.
 * Hidden and idle are base states; moving leads to attached or circling.
 * Drag can interrupt every visible state except circling.
 * Speech is intentionally not a state: it runs in parallel with body behavior.
 */

import type { BlobStateName } from '../types';

/**
 * Legal body transitions. Dismissal is valid from every visible state.
 * Dragging can interrupt travel or an attachment, but a ring cannot be dragged.
 */
const TRANSITIONS: Readonly<Record<BlobStateName, readonly BlobStateName[]>> = {
  hidden: ['idle'],
  idle: ['moving', 'dragged', 'hidden'],
  moving: ['attached', 'circling', 'idle', 'dragged', 'hidden'],
  attached: ['moving', 'idle', 'dragged', 'hidden'],
  circling: ['moving', 'idle', 'hidden'],
  dragged: ['idle', 'hidden'],
};

export type BlobStateChangeHandler = (
  from: BlobStateName,
  to: BlobStateName,
) => void;

export class BlobState {
  private current: BlobStateName;
  private readonly changeHandlers = new Set<BlobStateChangeHandler>();

  constructor(initial: BlobStateName = 'idle') {
    this.current = initial;
  }

  get name(): BlobStateName {
    return this.current;
  }

  canTransition(to: BlobStateName): boolean {
    return TRANSITIONS[this.current].includes(to);
  }

  /**
   * Subscribe to accepted state changes. Handlers run synchronously and must not
   * throw or call transition(). Returns an unsubscribe function.
   */
  onChange(handler: BlobStateChangeHandler): () => void {
    this.changeHandlers.add(handler);
    return () => this.changeHandlers.delete(handler);
  }

  transition(to: BlobStateName): void {
    if (!this.canTransition(to)) {
      throw new Error(`Illegal blob state transition: ${this.current} -> ${to}`);
    }

    const from = this.current;
    this.current = to;
    for (const handler of this.changeHandlers) {
      handler(from, to);
    }
  }
}
