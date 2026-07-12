/**
 * Blob's body state machine.
 * Hidden and idle are base states; moving leads to attached or circling.
 * Drag can interrupt every visible state except circling.
 * Speech is intentionally not a state: it runs in parallel with body behavior.
 */
import type { BlobStateName } from '../types';
export type BlobStateChangeHandler = (from: BlobStateName, to: BlobStateName) => void;
export declare class BlobState {
    private current;
    private readonly changeHandlers;
    constructor(initial?: BlobStateName);
    get name(): BlobStateName;
    canTransition(to: BlobStateName): boolean;
    /**
     * Subscribe to accepted state changes. Handlers run synchronously and must not
     * throw or call transition(). Returns an unsubscribe function.
     */
    onChange(handler: BlobStateChangeHandler): () => void;
    transition(to: BlobStateName): void;
}
