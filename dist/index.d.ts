/** Blob's public entry point. */
import type { BlobCharacter, BlobController, BlobOptions } from './types';
export type { BlobController, BlobEventMap, BlobAttachmentOptions, BlobAttachmentSide, BlobBodyOptions, BlobBubbleOptions, BlobCharacter, BlobMorphOptions, BlobMorphShape, BlobOptions, BlobPhysicsOptions, BlobScript, BlobTarget, CssSize, BlobStateName, Renderer, RendererKind, SoftBodyState, StoryStep, Vec2, } from './types';
/** Give a character file a typed, dependency-free default export. */
export declare function defineBlobCharacter<T extends BlobCharacter>(character: T): T;
/**
 * Create a Blob mounted at the bottom-right of the viewport.
 */
export declare function createBlob(options?: BlobOptions): BlobController;
