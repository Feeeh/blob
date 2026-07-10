import { describe, expect, it } from 'vitest';
import { Spring } from './spring';

function advance(spring: Spring, timestep: number, steps: number): void {
  for (let step = 0; step < steps; step += 1) {
    spring.update(timestep);
  }
}

describe('Spring', () => {
  it('converges on its target and settles', () => {
    const spring = new Spring(0);
    spring.target = 100;

    advance(spring, 1 / 60, 120);

    expect(spring.value).toBe(100);
    expect(spring.velocity).toBe(0);
  });

  it('produces equivalent motion at different frame rates', () => {
    const atSixty = new Spring(0);
    const atOneTwenty = new Spring(0);
    atSixty.target = 100;
    atOneTwenty.target = 100;

    advance(atSixty, 1 / 60, 30);
    advance(atOneTwenty, 1 / 120, 60);

    expect(atSixty.value).toBeCloseTo(atOneTwenty.value, 8);
    expect(atSixty.velocity).toBeCloseTo(atOneTwenty.velocity, 8);
  });

  it('preserves equivalent motion for underdamped and overdamped springs', () => {
    for (const damping of [1, 40]) {
      const atSixty = new Spring(0, 100, damping);
      const atOneTwenty = new Spring(0, 100, damping);
      atSixty.target = 100;
      atOneTwenty.target = 100;

      advance(atSixty, 1 / 60, 30);
      advance(atOneTwenty, 1 / 120, 60);

      expect(atSixty.value).toBeCloseTo(atOneTwenty.value, 8);
      expect(atSixty.velocity).toBeCloseTo(atOneTwenty.velocity, 8);
    }
  });

  it('uses the underdamped and overdamped solutions for custom damping', () => {
    const underdamped = new Spring(0, 100, 1);
    const overdamped = new Spring(0, 100, 40);
    underdamped.target = 100;
    overdamped.target = 100;

    advance(underdamped, 1 / 120, 120);
    advance(overdamped, 1 / 120, 120);

    expect(underdamped.value).toBeGreaterThan(100);
    expect(overdamped.value).toBeGreaterThan(0);
    expect(overdamped.value).toBeLessThan(100);
  });

  it('does not overshoot with critical damping', () => {
    const spring = new Spring(0);
    spring.target = 100;

    for (let step = 0; step < 240; step += 1) {
      spring.update(1 / 120);
      expect(spring.value).toBeLessThanOrEqual(100);
    }
  });

  it('snaps immediately to a requested value', () => {
    const spring = new Spring(12);
    spring.velocity = 3;

    spring.snap(48);

    expect(spring.value).toBe(48);
    expect(spring.target).toBe(48);
    expect(spring.velocity).toBe(0);
  });

  it('ignores non-finite frame deltas', () => {
    const spring = new Spring(12);
    spring.target = 48;

    spring.update(Number.NaN);
    spring.update(Number.POSITIVE_INFINITY);

    expect(spring.value).toBe(12);
    expect(spring.velocity).toBe(0);
  });

  it('clamps a long frame to the maximum integration step', () => {
    const longFrame = new Spring(0);
    const clampedFrame = new Spring(0);
    longFrame.target = 100;
    clampedFrame.target = 100;

    longFrame.update(10);
    clampedFrame.update(0.1);

    expect(longFrame.value).toBe(clampedFrame.value);
    expect(longFrame.velocity).toBe(clampedFrame.velocity);
  });

  it('rejects non-physical stiffness and damping', () => {
    expect(() => new Spring(0, 0)).toThrow('positive finite number');
    expect(() => new Spring(0, 100, -1)).toThrow('non-negative finite number');
  });
});
