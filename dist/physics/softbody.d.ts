/**
 * Blob's body: a ring of perimeter points, each spring-bound to a rest position.
 * Behaviors only move rest positions; the springs create all squish and stretch.
 */
import type { BlobMorphOptions, BlobPhysicsOptions, SoftBodyState, Vec2 } from '../types';
export declare const DEFAULT_POINT_COUNT = 48;
export declare class SoftBody {
    private readonly radius;
    private readonly color;
    private readonly reducedMotion;
    private readonly physics;
    readonly pointCount: number;
    private readonly points;
    private readonly centerX;
    private readonly centerY;
    private ringStyle;
    private initialized;
    private elapsedSeconds;
    private mode;
    private shape;
    private customRest;
    private wobbleScale;
    constructor(pointCount?: number, radius?: number, color?: string, reducedMotion?: boolean, physics?: BlobPhysicsOptions);
    /** Set the idle center. Subsequent updates breathe and bob around this point. */
    setIdleAt(center: Vec2): void;
    /** Move a circular body to a viewport coordinate without its idle bob. */
    setMovingAt(center: Vec2): void;
    get center(): Vec2;
    get isCenterAtRest(): boolean;
    /** Compress the perimeter toward the body center as it lands on a target. */
    squishTowards(direction: Vec2): void;
    /** Set arbitrary perimeter rest positions for later attachment and ring behaviors. */
    setRestPositions(points: readonly Vec2[], center: Vec2): void;
    /** Expand the perimeter into a rounded rectangle around a target element. */
    setRingAround(rect: DOMRectReadOnly, options?: BlobMorphOptions | number): void;
    poke(): void;
    update(dtSeconds: number): SoftBodyState;
    /** Keep a morphed body alive: ripple each point radially around its rest slot. */
    private wobbleCustomRest;
    private setPointTargets;
    private assertFinitePoint;
}
export declare function sampleRoundedRect(rect: DOMRectReadOnly, padding: number, count: number, cornerRadius?: number): Vec2[];
