import { describe, expect, it } from 'vitest';
import { sampleRoundedRect, SoftBody } from './softbody';

describe('SoftBody', () => {
  it('creates a circular rest pose around its idle center', () => {
    const body = new SoftBody(4, 10, '#abcdef', true);
    body.setIdleAt({ x: 50, y: 80 });

    const state = body.update(1 / 60);

    expect(state.center).toEqual({ x: 50, y: 80 });
    expect(state.color).toBe('#abcdef');
    expect(state.points).toEqual([
      { x: 60, y: 80 },
      { x: 50, y: 90 },
      { x: 40, y: 80 },
      { x: 50, y: 70 },
    ]);
  });

  it('snaps to a new idle center when reduced motion is enabled', () => {
    const body = new SoftBody(4, 10, '#8b5cf6', true);
    body.setIdleAt({ x: 20, y: 30 });
    body.update(0);
    body.setIdleAt({ x: 80, y: 90 });

    const state = body.update(1 / 60);

    expect(state.center).toEqual({ x: 80, y: 90 });
    expect(state.points[0]).toEqual({ x: 90, y: 90 });
  });

  it('uses supplied rest positions without idle offsets', () => {
    const body = new SoftBody(4, 10, '#8b5cf6', true);
    const points = [
      { x: 10, y: 10 },
      { x: 30, y: 10 },
      { x: 30, y: 30 },
      { x: 10, y: 30 },
    ];

    body.setRestPositions(points, { x: 20, y: 20 });

    expect(body.update(1).center).toEqual({ x: 20, y: 20 });
    expect(body.update(1).points).toEqual(points);
  });

  it('bobs and changes perimeter targets when motion is enabled', () => {
    const body = new SoftBody(4, 10);
    body.setIdleAt({ x: 50, y: 80 });
    const initial = body.update(0);
    const animated = body.update(0.1);

    expect(animated.center.y).not.toBe(initial.center.y);
    expect(animated.points[0]).not.toEqual(initial.points[0]);
  });

  it('clamps long animation frames before advancing idle motion', () => {
    const longFrame = new SoftBody(4, 10);
    const clampedFrame = new SoftBody(4, 10);
    longFrame.setIdleAt({ x: 50, y: 80 });
    clampedFrame.setIdleAt({ x: 50, y: 80 });

    expect(longFrame.update(5)).toEqual(clampedFrame.update(0.1));
  });

  it('moves a reduced-motion body without idle bobbing', () => {
    const body = new SoftBody(4, 10, '#8b5cf6', true);
    body.setIdleAt({ x: 20, y: 30 });
    body.setMovingAt({ x: 80, y: 90 });

    const state = body.update(1 / 60);

    expect(state.center).toEqual({ x: 80, y: 90 });
    expect(state.points[0]).toEqual({ x: 90, y: 90 });
  });

  it('samples and snaps a hollow ring around a target rectangle', () => {
    const body = new SoftBody(8, 10, '#8b5cf6', true);
    const rect = { left: 100, top: 80, width: 120, height: 60, right: 220, bottom: 140 } as DOMRectReadOnly;
    const points = sampleRoundedRect(rect, 10, 8);
    body.setRingAround(rect, 10);

    const state = body.update(0);

    expect(points).toHaveLength(8);
    expect(points[0]).toEqual({ x: 114, y: 70 });
    expect(state.shape).toBe('ring');
    expect(state.center).toEqual({ x: 160, y: 110 });
    expect(state.points).toEqual(points);
  });

  it('rejects invalid point counts and radii', () => {
    expect(() => new SoftBody(2)).toThrow('at least three perimeter points');
    expect(() => new SoftBody(16, 0)).toThrow('positive finite number');
  });
});
