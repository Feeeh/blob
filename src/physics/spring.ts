/**
 * Damped spring used for Blob's center, perimeter points, and later impulses.
 * The update is an analytic solution for a constant target, so equivalent
 * elapsed time produces the same result at different frame rates.
 */

const MAX_DT_SECONDS = 0.1;
const SETTLE_DISTANCE = 0.001;
const SETTLE_VELOCITY = 0.001;

export class Spring {
  value: number;
  velocity = 0;
  target: number;

  constructor(
    initial = 0,
    /** Higher = snappier. */
    readonly stiffness = 170,
    /** Defaults to critical damping for the supplied stiffness. */
    readonly damping = 2 * Math.sqrt(stiffness),
  ) {
    if (!Number.isFinite(this.stiffness) || this.stiffness <= 0) {
      throw new RangeError('Spring stiffness must be a positive finite number.');
    }
    if (!Number.isFinite(this.damping) || this.damping < 0) {
      throw new RangeError('Spring damping must be a non-negative finite number.');
    }
    this.value = initial;
    this.target = initial;
  }

  update(dtSeconds: number): void {
    const dt = Number.isFinite(dtSeconds)
      ? Math.min(Math.max(dtSeconds, 0), MAX_DT_SECONDS)
      : 0;
    if (dt === 0 || (this.value === this.target && this.velocity === 0)) {
      return;
    }

    const displacement = this.value - this.target;
    const naturalFrequency = Math.sqrt(this.stiffness);
    const dampingRatio = Math.max(this.damping, 0) / (2 * naturalFrequency);

    if (dampingRatio < 1 - Number.EPSILON) {
      const dampedFrequency = naturalFrequency * Math.sqrt(1 - dampingRatio ** 2);
      const decay = Math.exp(-dampingRatio * naturalFrequency * dt);
      const cosine = Math.cos(dampedFrequency * dt);
      const sine = Math.sin(dampedFrequency * dt);
      const velocityTerm = (this.velocity + dampingRatio * naturalFrequency * displacement)
        / dampedFrequency;

      this.value = this.target + decay * (displacement * cosine + velocityTerm * sine);
      this.velocity = decay * (
        this.velocity * cosine
        - ((naturalFrequency ** 2 * displacement
          + dampingRatio * naturalFrequency * this.velocity) / dampedFrequency) * sine
      );
    } else if (dampingRatio <= 1 + Number.EPSILON) {
      const decay = Math.exp(-naturalFrequency * dt);
      const velocityTerm = this.velocity + naturalFrequency * displacement;

      this.value = this.target + (displacement + velocityTerm * dt) * decay;
      this.velocity = (this.velocity - naturalFrequency * velocityTerm * dt) * decay;
    } else {
      const root = Math.sqrt(dampingRatio ** 2 - 1);
      const rootOne = -naturalFrequency * (dampingRatio - root);
      const rootTwo = -naturalFrequency * (dampingRatio + root);
      const coefficientOne = (this.velocity - rootTwo * displacement) / (rootOne - rootTwo);
      const coefficientTwo = displacement - coefficientOne;
      const termOne = coefficientOne * Math.exp(rootOne * dt);
      const termTwo = coefficientTwo * Math.exp(rootTwo * dt);

      this.value = this.target + termOne + termTwo;
      this.velocity = rootOne * termOne + rootTwo * termTwo;
    }

    if (
      Math.abs(this.target - this.value) < SETTLE_DISTANCE
      && Math.abs(this.velocity) < SETTLE_VELOCITY
    ) {
      this.snap(this.target);
    }
  }

  get isAtRest(): boolean {
    return this.value === this.target && this.velocity === 0;
  }

  /** Instant jump, used for prefers-reduced-motion. */
  snap(value: number): void {
    this.value = value;
    this.target = value;
    this.velocity = 0;
  }
}
