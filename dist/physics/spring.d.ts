/**
 * Damped spring used for Blob's center, perimeter points, and later impulses.
 * The update is an analytic solution for a constant target, so equivalent
 * elapsed time produces the same result at different frame rates.
 */
export declare class Spring {
    /** Higher = snappier. */
    readonly stiffness: number;
    /** Defaults to critical damping for the supplied stiffness. */
    readonly damping: number;
    value: number;
    velocity: number;
    target: number;
    constructor(initial?: number, 
    /** Higher = snappier. */
    stiffness?: number, 
    /** Defaults to critical damping for the supplied stiffness. */
    damping?: number);
    update(dtSeconds: number): void;
    get isAtRest(): boolean;
    /** Instant jump, used for prefers-reduced-motion. */
    snap(value: number): void;
}
