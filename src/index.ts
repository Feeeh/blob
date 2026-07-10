/** Blob's public entry point. */

import { Anchor, attachmentPoint } from './core/anchor';
import { compileDataAttributes } from './core/data-attrs';
import { BlobEmitter } from './core/emitter';
import { BlobState } from './core/state';
import { StoryEngine } from './core/story';
import { PokeBehavior } from './interact/poke';
import { DragBehavior } from './interact/drag';
import { DismissBehavior } from './interact/dismiss';
import { DEFAULT_POINT_COUNT, SoftBody } from './physics/softbody';
import { createRenderer } from './renderers/renderer';
import { SpeechBubble } from './speech/bubble';
import blobStyles from './styles.css?inline';
import type {
  BlobBubbleOptions,
  BlobCharacter,
  BlobController,
  BlobOptions,
  CssSize,
  Renderer,
  Vec2,
} from './types';

export type {
  BlobController,
  BlobEventMap,
  BlobAttachmentOptions,
  BlobAttachmentSide,
  BlobBodyOptions,
  BlobBubbleOptions,
  BlobCharacter,
  BlobMorphOptions,
  BlobMorphShape,
  BlobOptions,
  BlobPhysicsOptions,
  BlobScript,
  BlobTarget,
  CssSize,
  BlobStateName,
  Renderer,
  RendererKind,
  SoftBodyState,
  StoryStep,
  Vec2,
} from './types';

const DEFAULT_COLOR = '#8b5cf6';
const DEFAULT_SIZE = 48;
const DEFAULT_Z_INDEX = 2_147_483_000;
const VIEWPORT_MARGIN = 16;
const STYLE_ATTRIBUTE = 'data-blob-styles';

type MotionKind = 'idle' | 'move' | 'rest' | 'attach' | 'circle';

interface Motion {
  kind: MotionKind;
  target: Vec2 | null;
  direction: Vec2;
  landed: boolean;
  attachedElement: HTMLElement | null;
  attachEmitted: boolean;
}

/** Give a character file a typed, dependency-free default export. */
export function defineBlobCharacter<T extends BlobCharacter>(character: T): T {
  return character;
}

/**
 * Create a Blob mounted at the bottom-right of the viewport.
 */
export function createBlob(options: BlobOptions = {}): BlobController {
  if (typeof document === 'undefined' || document.body === null) {
    throw new Error('createBlob() must be called after document.body is available.');
  }

  const size = positiveFinite(options.body?.size ?? options.size, DEFAULT_SIZE);
  const color = options.body?.color ?? options.color ?? DEFAULT_COLOR;
  const pointCount = positiveInteger(options.body?.points, DEFAULT_POINT_COUNT);
  const physics = options.physics === false ? {} : options.physics ?? {};
  const reducedMotion = options.physics === false || shouldReduceMotion(options);
  const bubbleOptions = options.bubble === false ? null : options.bubble ?? {};
  installStyles();

  const host = document.createElement('div');
  host.className = 'blob-layer';
  Object.assign(host.style, {
    position: 'fixed',
    inset: '0',
    pointerEvents: 'none',
    zIndex: String(finiteNumber(options.zIndex, DEFAULT_Z_INDEX)),
  });
  applyTheme(host, color, bubbleOptions);
  const visualLayer = document.createElement('div');
  visualLayer.className = 'blob-visual';
  host.append(visualLayer);
  const hitTarget = document.createElement('button');
  hitTarget.type = 'button';
  hitTarget.className = 'blob-hit-target';
  hitTarget.setAttribute('aria-label', 'Blob, your guide');
  visualLayer.append(hitTarget);
  const dismissButton = document.createElement('button');
  dismissButton.type = 'button';
  dismissButton.className = 'blob-dismiss-button';
  dismissButton.setAttribute('aria-label', 'Dismiss Blob');
  dismissButton.append(dismissCross());
  visualLayer.append(dismissButton);

  const body = new SoftBody(pointCount, size, color, reducedMotion, physics);
  const renderer = createRenderer(options.renderer ?? 'canvas2d', reducedMotion);
  const bubble = bubbleOptions === null ? null : new SpeechBubble(speechOptions(bubbleOptions, reducedMotion));
  const emitter = new BlobEmitter();
  const state = new BlobState();
  let destroyed = false;
  let frame: number | null = null;
  let previousFrameTime = performance.now();
  let activeAnchor: Anchor | null = null;
  let motionWaiter: (() => void) | null = null;
  let story: StoryEngine | null = null;
  let dragTarget: Vec2 | null = null;
  let dismissed = false;
  let scriptCleanup: (() => void) | null = null;
  let lastCenter: Vec2 = { x: 0, y: 0 };
  let motion: Motion = {
    kind: 'idle',
    target: null,
    direction: { x: 0, y: 0 },
    landed: true,
    attachedElement: null,
    attachEmitted: false,
  };

  const home = (): Vec2 => ({
    x: viewportWidth() - size - VIEWPORT_MARGIN,
    y: viewportHeight() - size - VIEWPORT_MARGIN,
  });

  const enterMovingState = (): void => {
    if (state.name !== 'moving' && state.canTransition('moving')) {
      state.transition('moving');
    }
  };

  const setMotionTarget = (kind: Exclude<MotionKind, 'idle' | 'rest'>, target: Vec2): void => {
    const targetChanged = motion.target === null || distance(motion.target, target) > 0.5;
    motion.kind = kind;
    motion.attachedElement = kind === 'attach' || kind === 'circle'
      ? motion.attachedElement
      : null;
    if (!targetChanged) {
      return;
    }

    motion.target = target;
    motion.direction = { x: target.x - lastCenter.x, y: target.y - lastCenter.y };
    if ((kind === 'attach' || kind === 'circle') && motion.attachEmitted) {
      return;
    }
    motion.landed = false;
    enterMovingState();
  };

  const releaseAnchor = (): void => {
    activeAnchor?.stop();
    activeAnchor = null;
  };

  const resolveMotion = (): void => {
    const resolve = motionWaiter;
    motionWaiter = null;
    resolve?.();
  };

  const waitForMotion = (): Promise<void> => {
    if (motion.landed || motion.kind === 'idle' && body.isCenterAtRest) return Promise.resolve();
    return new Promise((resolve) => {
      motionWaiter = resolve;
    });
  };

  const finishMotion = (): void => {
    if (motion.landed || motion.target === null || !body.isCenterAtRest) {
      return;
    }

    motion.landed = true;
    body.squishTowards(motion.direction);
    if (motion.kind === 'attach') {
      if (state.canTransition('attached')) {
        state.transition('attached');
      }
      if (motion.attachedElement !== null && !motion.attachEmitted) {
        motion.attachEmitted = true;
        emitter.emit('attach', motion.attachedElement);
      }
      resolveMotion();
      return;
    }

    if (motion.kind === 'circle') {
      if (state.canTransition('circling')) {
        state.transition('circling');
      }
      if (motion.attachedElement !== null && !motion.attachEmitted) {
        motion.attachEmitted = true;
        emitter.emit('circle', motion.attachedElement);
      }
      resolveMotion();
      return;
    }

    if (motion.kind === 'move') {
      motion.kind = 'rest';
      if (state.canTransition('idle')) {
        state.transition('idle');
      }
      resolveMotion();
    }
  };

  const render = (dtSeconds: number): void => {
    if (dragTarget !== null) {
      body.setMovingAt(dragTarget);
    } else if (motion.kind === 'idle') {
      body.setIdleAt(home());
    } else if (motion.kind === 'rest' && motion.target !== null) {
      body.setIdleAt(motion.target);
    } else if (motion.kind !== 'circle' && motion.target !== null) {
      body.setMovingAt(motion.target);
    }

    const snapshot = body.update(dtSeconds);
    lastCenter = snapshot.center;
    renderer.render(snapshot);
    const bounds = bubbleAnchor(snapshot, size);
    bubble?.follow(bounds);
    Object.assign(hitTarget.style, {
      left: `${Math.round(snapshot.center.x - size)}px`,
      top: `${Math.round(snapshot.center.y - size)}px`,
      width: `${size * 2}px`,
      height: `${size * 2}px`,
    });
    if (options.dismissible !== false) {
      positionDismissButton(
        dismissButton,
        bounds,
        bubble?.visibleRect ?? null,
        motion.kind === 'idle' || motion.kind === 'rest',
      );
    }

    if (motion.kind === 'idle' && state.name === 'moving' && body.isCenterAtRest) {
      state.transition('idle');
      motion.landed = true;
      resolveMotion();
    } else if (motion.kind !== 'rest') {
      finishMotion();
    }
  };

  const scheduleFrame = (): void => {
    if (!destroyed && !reducedMotion && document.visibilityState !== 'hidden') {
      frame = window.requestAnimationFrame(tick);
    }
  };

  const tick = (time: number): void => {
    frame = null;
    if (destroyed || document.visibilityState === 'hidden') {
      return;
    }

    render((time - previousFrameTime) / 1000);
    previousFrameTime = time;
    scheduleFrame();
  };

  const onVisibilityChange = (): void => {
    if (document.visibilityState === 'hidden') {
      if (frame !== null) {
        window.cancelAnimationFrame(frame);
        frame = null;
      }
      return;
    }

    previousFrameTime = performance.now();
    render(0);
    scheduleFrame();
  };

  const onResize = (): void => {
    if (isResizableRenderer(renderer)) {
      renderer.resize();
    }
    render(0);
  };

  document.body.append(host);
  try {
    renderer.mount(visualLayer);
    bubble?.mount(visualLayer);
    render(0);
  } catch (error) {
    bubble?.destroy();
    renderer.destroy();
    host.remove();
    throw error;
  }

  window.addEventListener('resize', onResize);
  document.addEventListener('visibilitychange', onVisibilityChange);
  scheduleFrame();

  const controller: BlobController = {
    start: () => {
      if (destroyed) return;
      emitter.emit('start', undefined);
      void story?.play();
    },
    pause: () => story?.pause(),
    skip: () => story?.skip(),
    say: (text) => {
      if (destroyed) {
        return Promise.resolve();
      }
      emitter.emit('say', text);
      return bubble?.say(text) ?? Promise.resolve();
    },
    moveTo: (target) => {
      if (destroyed || !isFinitePoint(target)) {
        return;
      }
      releaseAnchor();
      motion = {
        kind: 'move',
        target: null,
        direction: { x: 0, y: 0 },
        landed: false,
        attachedElement: null,
        attachEmitted: false,
      };
      setMotionTarget('move', target);
      render(0);
    },
    attachTo: (target, overrides = {}) => {
      if (destroyed) {
        return;
      }
      const element = Anchor.resolve(target);
      if (element === null) {
        emitter.emit('warn', 'Blob could not resolve an attachment target.');
        resolveMotion();
        return;
      }

      releaseAnchor();
      const attachment = { ...options.attachment, ...overrides };
      motion = {
        kind: 'attach',
        target: null,
        direction: { x: 0, y: 0 },
        landed: false,
        attachedElement: element,
        attachEmitted: false,
      };
      const anchor = new Anchor(element, {
        onRect: (rect) => {
          if (activeAnchor !== anchor) {
            return;
          }
          if (rect.width === 0 || rect.height === 0) {
            activeAnchor = null;
            anchor.stop();
            emitter.emit('warn', 'Blob detached because its attachment target is no longer visible.');
            controller.detach();
            return;
          }
          setMotionTarget('attach', attachmentPoint(
            rect,
            lastCenter,
            size + nonNegativeFinite(attachment.gap, 0),
            attachment.side,
          ));
          if (reducedMotion) {
            render(0);
          }
        },
        onLost: () => {
          if (activeAnchor !== anchor) {
            return;
          }
          activeAnchor = null;
          emitter.emit('warn', 'Blob detached because its attachment target is no longer available.');
          controller.detach();
        },
      });
      activeAnchor = anchor;
      anchor.start();
      render(0);
    },
    circle: (target, overrides = {}) => {
      if (destroyed) {
        return;
      }
      if (options.renderer === 'css') {
        controller.attachTo(target);
        return;
      }
      const element = Anchor.resolve(target);
      if (element === null) {
        emitter.emit('warn', 'Blob could not resolve a circle target.');
        resolveMotion();
        return;
      }

      releaseAnchor();
      const morph = { ...options.morph, ...overrides };
      motion = {
        kind: 'circle',
        target: null,
        direction: { x: 0, y: 0 },
        landed: false,
        attachedElement: element,
        attachEmitted: false,
      };
      const anchor = new Anchor(element, {
        onRect: (rect) => {
          if (activeAnchor !== anchor) {
            return;
          }
          if (rect.width === 0 || rect.height === 0) {
            activeAnchor = null;
            anchor.stop();
            emitter.emit('warn', 'Blob detached because its circle target is no longer visible.');
            controller.detach();
            return;
          }
          body.setRingAround(rect, morph);
          setMotionTarget('circle', { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
          if (reducedMotion) {
            render(0);
          }
        },
        onLost: () => {
          if (activeAnchor !== anchor) {
            return;
          }
          activeAnchor = null;
          emitter.emit('warn', 'Blob detached because its circle target is no longer available.');
          controller.detach();
        },
      });
      activeAnchor = anchor;
      anchor.start();
      render(0);
    },
    detach: () => {
      if (destroyed || motion.kind === 'idle') {
        return;
      }
      const wasAttached = motion.kind === 'attach' || motion.kind === 'circle';
      releaseAnchor();
      motion = {
        kind: 'idle',
        target: null,
        direction: { x: 0, y: 0 },
        landed: false,
        attachedElement: null,
        attachEmitted: false,
      };
      enterMovingState();
      if (wasAttached) {
        emitter.emit('detach', undefined);
      }
      render(0);
    },
    destroy: () => {
      if (destroyed) {
        return;
      }

      destroyed = true;
      if (frame !== null) {
        window.cancelAnimationFrame(frame);
      }
      releaseAnchor();
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      poke.disable();
      drag.disable();
      dismiss.destroy();
      const cleanup = scriptCleanup;
      scriptCleanup = null;
      try {
        cleanup?.();
      } finally {
        bubble?.destroy();
        renderer.destroy();
        emitter.clear();
        host.remove();
      }
    },
    on: (event, handler) => emitter.on(event, handler),
    off: (event, handler) => emitter.off(event, handler),
  };
  const poke = new PokeBehavior(() => {
    if (state.name !== 'idle') return;
    if (bubble?.isSpeaking) {
      bubble.advance();
    } else if (steps.length > 0) {
      controller.start();
    } else {
      body.poke();
    }
  });
  poke.enable(hitTarget);
  const drag = new DragBehavior(
    () => {
      if (dismissed || state.name === 'circling' || !state.canTransition('dragged')) return false;
      releaseAnchor();
      state.transition('dragged');
      return true;
    },
    (point) => { dragTarget = point; render(0); },
    () => {
      dragTarget = null;
      if (state.name === 'dragged') state.transition('idle');
      motion = { kind: 'idle', target: null, direction: { x: 0, y: 0 }, landed: false, attachedElement: null, attachEmitted: false };
      resolveMotion();
    },
  );
  if (options.draggable !== false) drag.enable(hitTarget);
  const dismiss = new DismissBehavior(options.storageKey, () => {
    dismissed = true;
    visualLayer.hidden = true;
    emitter.emit('dismiss', undefined);
  }, () => {
    dismissed = false;
    visualLayer.hidden = false;
    render(0);
  });
  if (options.dismissible !== false) {
    dismiss.mount(host);
    dismissButton.addEventListener('click', () => dismiss.dismiss());
    if (dismiss.isDismissed()) dismiss.dismiss();
  } else {
    dismissButton.hidden = true;
  }
  const steps = [...(options.story ?? []), ...compileDataAttributes()];
  const storageKey = `${options.storageKey ?? 'blob'}:story-played`;
  story = new StoryEngine({
    sleep: (ms) => new Promise((resolve) => window.setTimeout(resolve, ms)),
    say: (text) => controller.say(text),
    moveTo: async (x, y) => { controller.moveTo({ x, y }); await waitForMotion(); },
    attachTo: async (target, attachment) => { controller.attachTo(target, attachment); await waitForMotion(); },
    circle: async (target, morph) => { controller.circle(target, morph); await waitForMotion(); },
    detach: async () => { controller.detach(); await waitForMotion(); },
    skipSpeech: () => { bubble?.advance(); bubble?.advance(); },
    onStep: (step) => emitter.emit('step', step),
    onEnd: () => {
      try { window.localStorage.setItem(storageKey, 'true'); } catch {}
      emitter.emit('end', undefined);
    },
  }, steps);
  try {
    const cleanup = options.script?.(controller);
    if (typeof cleanup === 'function') scriptCleanup = cleanup;
  } catch (error) {
    controller.destroy();
    throw error;
  }
  if (!destroyed && options.autoStart && !wasStoryPlayed(storageKey)) controller.start();
  return controller;
}

function shouldReduceMotion(options: BlobOptions): boolean {
  return options.respectReducedMotion !== false
    && typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function positiveFinite(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback;
}

function positiveInteger(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 3 ? value : fallback;
}

function nonNegativeFinite(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback;
}

function finiteNumber(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function viewportWidth(): number {
  return document.documentElement.clientWidth || window.innerWidth;
}

function viewportHeight(): number {
  return document.documentElement.clientHeight || window.innerHeight;
}

function isResizableRenderer(renderer: Renderer): renderer is Renderer & { resize(): void } {
  return typeof renderer.resize === 'function';
}

/** A black X over a thicker white X, so it stays readable on any background. */
function dismissCross(): SVGSVGElement {
  const namespace = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(namespace, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  for (const [color, width] of [['#ffffff', 9], ['#000000', 4.5]] as const) {
    const path = document.createElementNS(namespace, 'path');
    path.setAttribute('d', 'M6 6 18 18 M18 6 6 18');
    path.setAttribute('stroke', color);
    path.setAttribute('stroke-width', String(width));
    path.setAttribute('stroke-linecap', 'square');
    path.setAttribute('fill', 'none');
    svg.append(path);
  }
  return svg;
}

/**
 * Pin the dismiss button to the body's top-right corner, flipping below the
 * content when the top edge is off-screen, and always clamped to the viewport.
 */
function positionDismissButton(
  button: HTMLButtonElement,
  body: DOMRectReadOnly,
  bubbleRect: DOMRectReadOnly | null,
  standing: boolean,
): void {
  // A silent Blob standing in its corner needs no X; morphing/travelling always shows it.
  const hidden = standing && bubbleRect === null;
  button.hidden = hidden;
  if (hidden) {
    return;
  }

  const margin = 4;
  const gap = 4;
  const buttonSize = button.offsetWidth || 20;
  let left: number;
  let top: number;
  if (standing && bubbleRect !== null && bubbleRect.top < body.top) {
    // Standing and speaking: tuck the X under the bubble, on Blob's free left side.
    left = body.left - buttonSize - gap;
    top = bubbleRect.bottom + gap;
  } else {
    // Morphed or travelling: sit fully above the content, or beside its
    // bottom-right corner when the top is off-screen.
    const fitsAbove = body.top - buttonSize - gap >= margin;
    top = fitsAbove ? body.top - buttonSize - gap : body.bottom - buttonSize / 2;
    left = fitsAbove ? body.right - buttonSize / 2 : body.right + gap;
  }
  button.style.left = `${Math.round(clampToRange(left, margin, viewportWidth() - buttonSize - margin))}px`;
  button.style.top = `${Math.round(clampToRange(top, margin, viewportHeight() - buttonSize - margin))}px`;
}

function clampToRange(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), Math.max(minimum, maximum));
}

function bubbleAnchor(
  snapshot: { center: Vec2; points: readonly Vec2[]; shape: 'solid' | 'ring'; strokeWidth: number },
  radius: number,
): DOMRectReadOnly {
  if (snapshot.shape === 'ring' && snapshot.points.length > 0) {
    const xs = snapshot.points.map((point) => point.x);
    const ys = snapshot.points.map((point) => point.y);
    const left = Math.min(...xs) - snapshot.strokeWidth / 2;
    const right = Math.max(...xs) + snapshot.strokeWidth / 2;
    const top = Math.min(...ys) - snapshot.strokeWidth / 2;
    const bottom = Math.max(...ys) + snapshot.strokeWidth / 2;
    return rect(left, top, right - left, bottom - top);
  }
  return rect(snapshot.center.x - radius, snapshot.center.y - radius, radius * 2, radius * 2);
}

function rect(left: number, top: number, width: number, height: number): DOMRectReadOnly {
  return {
    bottom: top + height,
    height,
    left,
    right: left + width,
    top,
    width,
    x: left,
    y: top,
    toJSON: () => ({ bottom: top + height, height, left, right: left + width, top, width, x: left, y: top }),
  } as DOMRectReadOnly;
}

function installStyles(): void {
  if (document.head.querySelector(`style[${STYLE_ATTRIBUTE}]`) !== null) {
    return;
  }

  const style = document.createElement('style');
  style.setAttribute(STYLE_ATTRIBUTE, '');
  style.textContent = blobStyles;
  document.head.append(style);
}

function applyTheme(host: HTMLElement, color: string, bubble: BlobBubbleOptions | null): void {
  host.style.setProperty('--blob-color', color);
  if (bubble === null) return;

  setCssVariable(host, '--blob-bubble-bg', bubble.background);
  setCssVariable(host, '--blob-bubble-fg', bubble.color);
  setCssVariable(host, '--blob-bubble-border', bubble.borderColor);
  setCssVariable(host, '--blob-bubble-border-width', bubble.borderWidth);
  setCssVariable(host, '--blob-bubble-padding', bubble.padding);
  setCssVariable(host, '--blob-bubble-font-size', bubble.fontSize);
  setCssVariable(host, '--blob-bubble-max-width', bubble.maxWidth);
  setCssVariable(host, '--blob-bubble-tail-size', bubble.tailSize);
  if (bubble.fontFamily !== undefined) host.style.setProperty('--blob-font', bubble.fontFamily);
  if (bubble.lineHeight !== undefined) host.style.setProperty('--blob-bubble-line-height', String(bubble.lineHeight));
  if (bubble.shadow !== undefined) host.style.setProperty('--blob-bubble-shadow', bubble.shadow);

  const radius = bubble.borderRadius ?? bubbleShapeRadius(bubble.shape);
  if (radius !== undefined) setCssVariable(host, '--blob-bubble-radius', radius);
}

function bubbleShapeRadius(shape: BlobBubbleOptions['shape']): CssSize | undefined {
  if (shape === 'square') return 0;
  if (shape === 'rounded') return 12;
  if (shape === 'circle') return '50%';
  return undefined;
}

function setCssVariable(host: HTMLElement, name: string, value: CssSize | undefined): void {
  if (value !== undefined) host.style.setProperty(name, typeof value === 'number' ? `${value}px` : value);
}

function speechOptions(bubble: BlobBubbleOptions, reducedMotion: boolean): {
  reducedMotion: boolean;
  characterDelay?: number;
  autoAdvance?: number;
  gap?: number;
  margin?: number;
  tail?: boolean;
  ariaLabel?: string;
} {
  return {
    reducedMotion,
    ...(bubble.characterDelay === undefined ? {} : { characterDelay: bubble.characterDelay }),
    ...(bubble.autoAdvance === undefined ? {} : { autoAdvance: bubble.autoAdvance }),
    ...(bubble.gap === undefined ? {} : { gap: bubble.gap }),
    ...(bubble.margin === undefined ? {} : { margin: bubble.margin }),
    ...(bubble.tail === undefined ? {} : { tail: bubble.tail }),
    ...(bubble.ariaLabel === undefined ? {} : { ariaLabel: bubble.ariaLabel }),
  };
}

function isFinitePoint(point: Vec2): boolean {
  return Number.isFinite(point.x) && Number.isFinite(point.y);
}

function distance(first: Vec2, second: Vec2): number {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function wasStoryPlayed(key: string): boolean {
  try { return window.localStorage.getItem(key) === 'true'; } catch { return false; }
}
