import { describe, expect, it } from 'vitest';
import type { BlobStateName } from '../types';
import { BlobState } from './state';

const states: readonly BlobStateName[] = [
  'hidden',
  'idle',
  'moving',
  'attached',
  'circling',
  'dragged',
];

const legalTransitions: Readonly<Record<BlobStateName, readonly BlobStateName[]>> = {
  hidden: ['idle'],
  idle: ['moving', 'dragged', 'hidden'],
  moving: ['attached', 'circling', 'idle', 'dragged', 'hidden'],
  attached: ['moving', 'idle', 'dragged', 'hidden'],
  circling: ['moving', 'idle', 'hidden'],
  dragged: ['idle', 'hidden'],
};

describe('BlobState', () => {
  it('starts in idle by default', () => {
    expect(new BlobState().name).toBe('idle');
  });

  for (const from of states) {
    for (const to of states) {
      const isLegal = legalTransitions[from].includes(to);

      it(`${from} ${isLegal ? 'allows' : 'rejects'} ${to}`, () => {
        const state = new BlobState(from);

        expect(state.canTransition(to)).toBe(isLegal);

        if (isLegal) {
          state.transition(to);
          expect(state.name).toBe(to);
          return;
        }

        expect(() => state.transition(to)).toThrow(
          `Illegal blob state transition: ${from} -> ${to}`,
        );
        expect(state.name).toBe(from);
      });
    }
  }

  it('notifies subscribers only for accepted transitions', () => {
    const state = new BlobState('idle');
    const changes: Array<[BlobStateName, BlobStateName]> = [];
    const unsubscribe = state.onChange((from, to) => changes.push([from, to]));

    expect(() => state.transition('circling')).toThrow(
      'Illegal blob state transition: idle -> circling',
    );
    state.transition('moving');
    unsubscribe();
    state.transition('attached');

    expect(changes).toEqual([['idle', 'moving']]);
  });
});
