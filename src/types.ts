/**
 * Public contracts for Blob.
 *
 * Every user-facing option and story field is OPTIONAL by design:
 * `createBlob()` with no arguments yields an idle, bobbing blob.
 */

export type RendererKind = 'canvas2d' | 'svg' | 'css';

export type BlobTarget = string | HTMLElement;
export type BlobMorphShape = 'circle' | 'square' | 'rectangle' | 'rounded';
export type BlobAttachmentSide = 'nearest' | 'top' | 'right' | 'bottom' | 'left';
export type CssSize = number | string;

export interface Vec2 {
  x: number;
  y: number;
}

/**
 * One step of Blob's story. Fields combine within a single step:
 * `{ sleep: 500, attachTo: '#nav', say: 'Menus!' }` waits 500 ms,
 * travels to `#nav`, attaches, then speaks.
 */
export interface StoryStep {
  /** Milliseconds to wait before executing the rest of the step. */
  sleep?: number;
  /** Text to speak via the typewriter bubble; waits for click-to-advance. */
  say?: string;
  /** Travel to the element and stick to its nearest edge. */
  attachTo?: BlobTarget;
  /** Per-step attachment overrides. */
  attach?: BlobAttachmentOptions;
  /** Expand the whole body into a ring wrapping the element. */
  circle?: BlobTarget;
  /** Per-step outline overrides used when `circle` is present. */
  morph?: BlobMorphOptions;
  /** Release the current target and return home (bottom-right). */
  detach?: boolean;
  /** Travel to a viewport coordinate. */
  moveTo?: Vec2;
}

/** Where a character rests while attached to an element. */
export interface BlobAttachmentOptions {
  /** Extra space in px between the character and its target. Default: 0. */
  gap?: number;
  /** Which target edge to use. Default: nearest. */
  side?: BlobAttachmentSide;
}

/** The outline drawn while Blob wraps an element. */
export interface BlobMorphOptions {
  /** Target outline. Default: rounded. */
  shape?: BlobMorphShape;
  /** Space in px between the target and the outline. Default: body size * 0.4. */
  padding?: number;
  /** Corner radius in px for a rounded outline. Default: 24. */
  radius?: number;
  /** Outline color. Defaults to the body color. */
  strokeColor?: string;
  /** Outline width in px. Defaults to body size * 0.55 (at least 8). */
  strokeWidth?: number;
  lineCap?: CanvasLineCap;
  lineJoin?: CanvasLineJoin;
}

/** Visual properties for Blob's soft body. */
export interface BlobBodyOptions {
  color?: string;
  /** Resting radius in px. */
  size?: number;
  /** Number of physics points around the body. At least 3. */
  points?: number;
}

/** Motion controls. Set `physics: false` for instant, static positioning. */
export interface BlobPhysicsOptions {
  /** Spring stiffness; higher values move faster. Default: 170. */
  stiffness?: number;
  /** Spring damping. Defaults to critical damping for the selected stiffness. */
  damping?: number;
  bobAmplitude?: number;
  bobFrequency?: number;
  /** Idle perimeter wobble as a fraction of body size. */
  breatheAmplitude?: number;
  breatheFrequency?: number;
  pokeStrength?: number;
  landingSquish?: number;
}

/** The DOM speech bubble. Use `false` when a character does not speak. */
export interface BlobBubbleOptions {
  background?: string;
  color?: string;
  borderColor?: string;
  borderWidth?: CssSize;
  borderRadius?: CssSize;
  /** `square` = 0 radius, `rounded` = 12px, `circle` = 50%. */
  shape?: 'square' | 'rounded' | 'circle';
  padding?: CssSize;
  fontFamily?: string;
  fontSize?: CssSize;
  lineHeight?: number | string;
  maxWidth?: CssSize;
  shadow?: string;
  /** Show the bubble pointer. Default: true. */
  tail?: boolean;
  tailSize?: CssSize;
  /** Distance in px from the character. Default: 16. */
  gap?: number;
  /** Minimum distance in px from the viewport edge. Default: 8. */
  margin?: number;
  characterDelay?: number;
  /** Keep each completed speech line visible for this many ms, then advance. Default: manual click. */
  autoAdvance?: number;
  ariaLabel?: string;
}

export interface BlobOptions {
  /** Renderer to draw the body with. Default: 'canvas2d'. */
  renderer?: RendererKind | Renderer;
  /** A character body. These fields take precedence over the legacy `color` and `size` fields. */
  body?: BlobBodyOptions;
  /** Body color. Default: '#8b5cf6' (purple). */
  color?: string;
  /** Resting radius in px. Default: 48. */
  size?: number;
  /** Turn off animation entirely or tune the built-in springs and idle motion. */
  physics?: BlobPhysicsOptions | false;
  /** Bubble appearance and typewriter timing. Use `false` to disable it. */
  bubble?: BlobBubbleOptions | false;
  /** Default attachment behavior, overridable per story step. */
  attachment?: BlobAttachmentOptions;
  /** Default morph outline, overridable per story step or `circle()` call. */
  morph?: BlobMorphOptions;
  /** Play the story on load instead of waiting for a click. Default: false. */
  autoStart?: boolean;
  /** Allow dragging Blob around (springs back home). Default: true. */
  draggable?: boolean;
  /** Show a control to minimize/hide Blob, persisted per visitor. Default: true. */
  dismissible?: boolean;
  /** Disable motion for visitors with prefers-reduced-motion. Default: true. */
  respectReducedMotion?: boolean;
  /** localStorage namespace for dismiss + "story already played". Default: 'blob'. */
  storageKey?: string;
  /** z-index of Blob's layer. Default: 2147483000. */
  zIndex?: number;
  /** The story to play. data-blob-* steps found in the DOM are appended after it. */
  story?: StoryStep[];
  /** Imperative behavior that runs after Blob mounts. Return a cleanup function if needed. */
  script?: BlobScript;
}

/** A named, reusable Blob configuration. It is intentionally just an options object. */
export interface BlobCharacter extends BlobOptions {}

export type BlobScript = (blob: BlobController) => void | (() => void);

/** Body states. Speech is a parallel channel, not a state — Blob can speak in any of these. */
export type BlobStateName =
  | 'hidden'
  | 'idle'
  | 'moving'
  | 'attached'
  | 'circling'
  | 'dragged';

/** Event name → payload delivered to listeners. */
export interface BlobEventMap {
  start: undefined;
  step: StoryStep;
  say: string;
  attach: HTMLElement;
  circle: HTMLElement;
  detach: undefined;
  end: undefined;
  dismiss: undefined;
  /** Non-fatal problems, e.g. a story target no longer exists in the DOM. */
  warn: string;
}

/**
 * Snapshot of the soft body for one frame. Renderers receive this and draw it —
 * they own no physics or behavior.
 */
export interface SoftBodyState {
  center: Vec2;
  /** Perimeter points, in order, forming a closed ring. */
  points: readonly Vec2[];
  color: string;
  shape: 'solid' | 'ring';
  strokeWidth: number;
  /** Ring-only visual overrides, useful to custom renderers. */
  strokeColor?: string;
  strokeLineCap?: CanvasLineCap;
  strokeLineJoin?: CanvasLineJoin;
  morphShape?: BlobMorphShape;
}

/** Contract every renderer implements. See blob.md §2 — renderers are dumb. */
export interface Renderer {
  /** Create DOM/canvas inside the given host layer. */
  mount(host: HTMLElement): void;
  /** Draw one frame. Called from the rAF loop. */
  render(body: SoftBodyState): void;
  /** Optional viewport resize hook, called before Blob renders a resize frame. */
  resize?(): void;
  /** Remove everything created in mount(). */
  destroy(): void;
}

/** The object returned by createBlob(). */
export interface BlobController {
  start(): void;
  pause(): void;
  /** Jump to the end of the story. */
  skip(): void;
  /** Speak a one-off line outside the story. Resolves when advanced. */
  say(text: string): Promise<void>;
  moveTo(target: Vec2): void;
  attachTo(target: BlobTarget, options?: BlobAttachmentOptions): void;
  circle(target: BlobTarget, options?: BlobMorphOptions): void;
  detach(): void;
  /** Remove Blob and everything it created from the DOM. */
  destroy(): void;
  on<K extends keyof BlobEventMap>(
    event: K,
    handler: (payload: BlobEventMap[K]) => void,
  ): void;
  off<K extends keyof BlobEventMap>(
    event: K,
    handler: (payload: BlobEventMap[K]) => void,
  ): void;
}
