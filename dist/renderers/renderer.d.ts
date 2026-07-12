/**
 * Renderer registry. Renderers are dumb: they receive the soft-body snapshot
 * each frame and draw it — no physics, no behavior (blob.md §2).
 * A custom renderer is just an object implementing the Renderer interface.
 */
import type { Renderer, RendererKind } from '../types';
export declare function createRenderer(kind: RendererKind | Renderer, reducedMotion?: boolean): Renderer;
