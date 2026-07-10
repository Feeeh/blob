/**
 * Blob's body: a ring of perimeter points, each spring-bound to a rest position.
 * Behaviors only move rest positions; the springs create all squish and stretch.
 */

import type { BlobMorphOptions, BlobMorphShape, BlobPhysicsOptions, SoftBodyState, Vec2 } from '../types';
import { Spring } from './spring';

export const DEFAULT_POINT_COUNT = 48;

const DEFAULT_BOB_AMPLITUDE = 6;
const DEFAULT_BOB_FREQUENCY = 1.8;
const DEFAULT_BREATHE_FREQUENCY = 2.4;
const DEFAULT_BREATHE_RATIO = 0.06;
const MAX_DT_SECONDS = 0.1;

interface PointSprings {
  x: Spring;
  y: Spring;
}

interface RingStyle {
  color: string;
  lineCap: CanvasLineCap;
  lineJoin: CanvasLineJoin;
  shape: BlobMorphShape;
  width: number;
}

export class SoftBody {
  readonly pointCount: number;

  private readonly points: PointSprings[];
  private readonly centerX: Spring;
  private readonly centerY: Spring;
  private ringStyle: RingStyle;
  private initialized = false;
  private elapsedSeconds = 0;
  private mode: 'idle' | 'moving' | 'custom' = 'idle';
  private shape: 'solid' | 'ring' = 'solid';

  constructor(
    pointCount: number = DEFAULT_POINT_COUNT,
    private readonly radius: number = 48,
    private readonly color = '#8b5cf6',
    private readonly reducedMotion = false,
    private readonly physics: BlobPhysicsOptions = {},
  ) {
    if (!Number.isInteger(pointCount) || pointCount < 3) {
      throw new RangeError('SoftBody requires at least three perimeter points.');
    }
    if (!Number.isFinite(radius) || radius <= 0) {
      throw new RangeError('SoftBody radius must be a positive finite number.');
    }

    this.pointCount = pointCount;
    this.centerX = createSpring(physics);
    this.centerY = createSpring(physics);
    this.points = Array.from({ length: pointCount }, () => ({
      x: createSpring(physics),
      y: createSpring(physics),
    }));
    this.ringStyle = defaultRingStyle(radius, color);
  }

  /** Set the idle center. Subsequent updates breathe and bob around this point. */
  setIdleAt(center: Vec2): void {
    this.assertFinitePoint(center, 'Idle center');
    this.mode = 'idle';
    this.shape = 'solid';

    if (!this.initialized) {
      this.centerX.snap(center.x);
      this.centerY.snap(center.y);
      this.setPointTargets(center.x, center.y, 0, true);
      this.initialized = true;
      return;
    }

    this.centerX.target = center.x;
    this.centerY.target = center.y;
  }

  /** Move a circular body to a viewport coordinate without its idle bob. */
  setMovingAt(center: Vec2): void {
    this.assertFinitePoint(center, 'Movement center');
    this.mode = 'moving';
    this.shape = 'solid';

    if (!this.initialized) {
      this.setIdleAt(center);
      this.mode = 'moving';
      return;
    }

    this.centerX.target = center.x;
    this.centerY.target = center.y;
  }

  get center(): Vec2 {
    return { x: this.centerX.value, y: this.centerY.value };
  }

  get isCenterAtRest(): boolean {
    return this.centerX.isAtRest && this.centerY.isAtRest;
  }

  get isAtRest(): boolean {
    return this.isCenterAtRest && this.points.every((point) => point.x.isAtRest && point.y.isAtRest);
  }

  /** Compress the perimeter toward the body center as it lands on a target. */
  squishTowards(direction: Vec2): void {
    const length = Math.hypot(direction.x, direction.y);
    if (length === 0 || this.reducedMotion) {
      return;
    }

    const unit = { x: direction.x / length, y: direction.y / length };
    for (const point of this.points) {
      const radialX = point.x.value - this.centerX.value;
      const radialY = point.y.value - this.centerY.value;
      const radialLength = Math.hypot(radialX, radialY);
      if (radialLength === 0) {
        continue;
      }
      const alignment = (radialX * unit.x + radialY * unit.y) / radialLength;
      const strength = nonNegativeFinite(this.physics.landingSquish, 260);
      point.x.velocity -= unit.x * alignment * strength;
      point.y.velocity -= unit.y * alignment * strength;
    }
  }

  /** Set arbitrary perimeter rest positions for later attachment and ring behaviors. */
  setRestPositions(points: readonly Vec2[], center: Vec2): void {
    if (points.length !== this.pointCount) {
      throw new RangeError(`SoftBody requires exactly ${this.pointCount} rest positions.`);
    }
    this.assertFinitePoint(center, 'Rest-position center');
    for (const point of points) {
      this.assertFinitePoint(point, 'Rest position');
    }

    this.mode = 'custom';
    const snap = !this.initialized || this.reducedMotion;
    if (snap) {
      this.centerX.snap(center.x);
      this.centerY.snap(center.y);
      this.initialized = true;
    } else {
      this.centerX.target = center.x;
      this.centerY.target = center.y;
    }

    for (let index = 0; index < this.pointCount; index += 1) {
      const point = this.points[index]!;
      const restPosition = points[index]!;
      if (snap) {
        point.x.snap(restPosition.x);
        point.y.snap(restPosition.y);
      } else {
        point.x.target = restPosition.x;
        point.y.target = restPosition.y;
      }
    }
  }

  /** Expand the perimeter into a rounded rectangle around a target element. */
  setRingAround(rect: DOMRectReadOnly, options: BlobMorphOptions | number = {}): void {
    const morph = typeof options === 'number' ? { padding: options } : options;
    const padding = nonNegativeFinite(morph.padding, this.radius * 0.4);
    const shape = morph.shape ?? 'rounded';
    const points = sampleOutline(
      rect,
      padding,
      this.pointCount,
      shape,
      nonNegativeFinite(morph.radius, 24),
    );
    this.setRestPositions(points, {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    });
    this.ringStyle = {
      color: morph.strokeColor ?? this.color,
      lineCap: morph.lineCap ?? 'round',
      lineJoin: morph.lineJoin ?? 'round',
      shape,
      width: nonNegativeFinite(morph.strokeWidth, Math.max(8, this.radius * 0.55)),
    };
    this.shape = 'ring';
  }

  poke(): void {
    if (this.reducedMotion) return;
    for (const point of this.points) {
      const x = point.x.value - this.centerX.value;
      const y = point.y.value - this.centerY.value;
      const length = Math.hypot(x, y) || 1;
      const strength = nonNegativeFinite(this.physics.pokeStrength, 180);
      point.x.velocity -= x / length * strength;
      point.y.velocity -= y / length * strength;
    }
  }

  update(dtSeconds: number): SoftBodyState {
    if (!this.initialized) {
      this.setIdleAt({ x: 0, y: 0 });
    }

    const dt = Number.isFinite(dtSeconds)
      ? Math.min(Math.max(dtSeconds, 0), MAX_DT_SECONDS)
      : 0;
    if (!this.reducedMotion) {
      this.elapsedSeconds += dt;
      this.centerX.update(dt);
      this.centerY.update(dt);
    } else {
      this.centerX.snap(this.centerX.target);
      this.centerY.snap(this.centerY.target);
    }

    const isIdle = this.mode === 'idle';
    const isCircular = isIdle || this.mode === 'moving';
    const bob = this.reducedMotion || !isIdle
      ? 0
      : Math.sin(this.elapsedSeconds * finiteNumber(this.physics.bobFrequency, DEFAULT_BOB_FREQUENCY))
        * finiteNumber(this.physics.bobAmplitude, DEFAULT_BOB_AMPLITUDE);
    if (isCircular) {
      this.setPointTargets(
        this.centerX.value,
        this.centerY.value + bob,
        this.elapsedSeconds,
        this.reducedMotion,
        isIdle,
      );
    }

    if (!this.reducedMotion) {
      for (const point of this.points) {
        point.x.update(dt);
        point.y.update(dt);
      }
    }

    return {
      center: { x: this.centerX.value, y: this.centerY.value + bob },
      points: this.points.map((point) => ({ x: point.x.value, y: point.y.value })),
      color: this.color,
      shape: this.shape,
      strokeColor: this.ringStyle.color,
      strokeLineCap: this.ringStyle.lineCap,
      strokeLineJoin: this.ringStyle.lineJoin,
      strokeWidth: this.ringStyle.width,
      morphShape: this.ringStyle.shape,
    };
  }

  private setPointTargets(
    centerX: number,
    centerY: number,
    elapsedSeconds: number,
    snap: boolean,
    breathe = false,
  ): void {
    for (let index = 0; index < this.pointCount; index += 1) {
      const angle = (index / this.pointCount) * Math.PI * 2;
      const breatheOffset = !breathe || this.reducedMotion
        ? 0
        : Math.sin(elapsedSeconds * finiteNumber(this.physics.breatheFrequency, DEFAULT_BREATHE_FREQUENCY) + index * 1.7)
          * this.radius * finiteNumber(this.physics.breatheAmplitude, DEFAULT_BREATHE_RATIO);
      const x = centerX + Math.cos(angle) * (this.radius + breatheOffset);
      const y = centerY + Math.sin(angle) * (this.radius + breatheOffset);
      const point = this.points[index]!;

      if (snap) {
        point.x.snap(x);
        point.y.snap(y);
      } else {
        point.x.target = x;
        point.y.target = y;
      }
    }
  }

  private assertFinitePoint(point: Vec2, label: string): void {
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
      throw new RangeError(`${label} must contain finite coordinates.`);
    }
  }
}

function createSpring(physics: BlobPhysicsOptions): Spring {
  const stiffness = positiveFinite(physics.stiffness, 170);
  return physics.damping === undefined
    ? new Spring(0, stiffness)
    : new Spring(0, stiffness, physics.damping);
}

function defaultRingStyle(radius: number, color: string): RingStyle {
  return {
    color,
    lineCap: 'round',
    lineJoin: 'round',
    shape: 'rounded',
    width: Math.max(8, radius * 0.55),
  };
}

function sampleOutline(
  rect: DOMRectReadOnly,
  padding: number,
  count: number,
  shape: BlobMorphShape,
  radius: number,
): Vec2[] {
  if (shape === 'circle') return sampleEllipse(rect, padding, count, true);
  if (shape === 'square') return sampleRoundedRect(squareRect(rect, padding), 0, count, 0);
  return sampleRoundedRect(rect, padding, count, shape === 'rectangle' ? 0 : radius);
}

function sampleEllipse(rect: DOMRectReadOnly, padding: number, count: number, circle: boolean): Vec2[] {
  const center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  const radius = circle
    ? Math.max(rect.width, rect.height) / 2 + padding
    : 0;
  const radiusX = radius || rect.width / 2 + padding;
  const radiusY = radius || rect.height / 2 + padding;
  return Array.from({ length: count }, (_, index) => {
    const angle = index / count * Math.PI * 2 - Math.PI / 2;
    return { x: center.x + Math.cos(angle) * radiusX, y: center.y + Math.sin(angle) * radiusY };
  });
}

function squareRect(rect: DOMRectReadOnly, padding: number): DOMRectReadOnly {
  const size = Math.max(rect.width, rect.height) + padding * 2;
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  return {
    bottom: centerY + size / 2,
    height: size,
    left: centerX - size / 2,
    right: centerX + size / 2,
    top: centerY - size / 2,
    width: size,
  } as DOMRectReadOnly;
}

function finiteNumber(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function positiveFinite(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback;
}

function nonNegativeFinite(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback;
}

export function sampleRoundedRect(
  rect: DOMRectReadOnly,
  padding: number,
  count: number,
  cornerRadius = 24,
): Vec2[] {
  if (!Number.isInteger(count) || count < 3) {
    throw new RangeError('Rounded rectangle sampling requires at least three points.');
  }
  const left = rect.left - padding;
  const top = rect.top - padding;
  const width = rect.width + padding * 2;
  const height = rect.height + padding * 2;
  const radius = Math.min(Math.max(cornerRadius, 0), width / 2, height / 2);
  if (width === 0 || height === 0) {
    return Array.from({ length: count }, (_, index) => ({
      x: left + width * index / Math.max(1, count - 1),
      y: top + height * index / Math.max(1, count - 1),
    }));
  }
  const straightWidth = Math.max(0, width - radius * 2);
  const straightHeight = Math.max(0, height - radius * 2);
  const arc = Math.PI * radius / 2;
  const perimeter = (straightWidth + straightHeight) * 2 + arc * 4;

  return Array.from({ length: count }, (_, index) => pointOnRoundedRect(
    left,
    top,
    width,
    height,
    radius,
    straightWidth,
    straightHeight,
    arc,
    perimeter * index / count,
  ));
}

function pointOnRoundedRect(
  left: number,
  top: number,
  width: number,
  height: number,
  radius: number,
  straightWidth: number,
  straightHeight: number,
  arc: number,
  distance: number,
): Vec2 {
  const segments = [straightWidth, arc, straightHeight, arc, straightWidth, arc, straightHeight, arc];
  let remaining = distance;
  let segment = 0;
  while (remaining > segments[segment]! && segment < segments.length - 1) {
    remaining -= segments[segment]!;
    segment += 1;
  }
  if (segment === 0) return { x: left + radius + remaining, y: top };
  if (segment === 1) return arcPoint(left + width - radius, top + radius, radius, -Math.PI / 2 + remaining / radius);
  if (segment === 2) return { x: left + width, y: top + radius + remaining };
  if (segment === 3) return arcPoint(left + width - radius, top + height - radius, radius, remaining / radius);
  if (segment === 4) return { x: left + width - radius - remaining, y: top + height };
  if (segment === 5) return arcPoint(left + radius, top + height - radius, radius, Math.PI / 2 + remaining / radius);
  if (segment === 6) return { x: left, y: top + height - radius - remaining };
  return arcPoint(left + radius, top + radius, radius, Math.PI + remaining / radius);
}

function arcPoint(centerX: number, centerY: number, radius: number, angle: number): Vec2 {
  return { x: centerX + Math.cos(angle) * radius, y: centerY + Math.sin(angle) * radius };
}
