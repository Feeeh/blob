/** Tracks an attachment target through layout, scrolling, and DOM removal. */
import type { BlobAttachmentSide, Vec2 } from '../types';
export interface AnchorCallbacks {
    onRect(rect: DOMRectReadOnly): void;
    onLost(): void;
}
/** Resolve an attachment target without allowing a malformed selector to throw. */
export declare function resolveAnchor(target: string | HTMLElement): HTMLElement | null;
/** Center a Blob just outside the nearest edge of a target rectangle. */
export declare function attachmentPoint(rect: DOMRectReadOnly, reference: Vec2, radius: number, side?: BlobAttachmentSide): Vec2;
export declare class Anchor {
    private readonly element;
    private readonly callbacks;
    private observer;
    private mutationObserver;
    private frame;
    private active;
    constructor(element: HTMLElement, callbacks: AnchorCallbacks);
    static resolve(target: string | HTMLElement): HTMLElement | null;
    start(): void;
    stop(): void;
    private readonly sample;
    private readonly schedule;
    private readonly onFrame;
}
