/**
 * Pixel-art speech bubble anchored above Blob. Story text is always written
 * through textContent and mirrored once to a polite live region.
 */

import { Typewriter } from './typewriter';

const DEFAULT_VIEWPORT_MARGIN = 8;
const DEFAULT_BUBBLE_GAP = 16;

export interface SpeechBubbleOptions {
  reducedMotion?: boolean;
  characterDelay?: number;
  gap?: number;
  margin?: number;
  tail?: boolean;
  autoAdvance?: number;
  ariaLabel?: string;
}

export class SpeechBubble {
  private element: HTMLButtonElement | null = null;
  private textElement: HTMLSpanElement | null = null;
  private liveRegion: HTMLDivElement | null = null;
  private typewriter: Typewriter | null = null;
  private anchor: DOMRectReadOnly | null = null;
  private speechId = 0;
  private measuredWidth = 0;
  private measuredHeight = 0;
  private autoAdvanceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly options: SpeechBubbleOptions = {}) {}

  get isSpeaking(): boolean {
    return this.typewriter?.isActive ?? false;
  }

  mount(host: HTMLElement): void {
    this.destroy();

    const element = document.createElement('button');
    const textElement = document.createElement('span');
    const liveRegion = document.createElement('div');
    element.className = 'blob-bubble';
    element.type = 'button';
    element.hidden = true;
    element.setAttribute('aria-label', this.options.ariaLabel ?? 'Advance speech');
    liveRegion.className = 'blob-sr-only';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    element.append(textElement);
    element.addEventListener('click', this.handleAdvance);
    host.append(element, liveRegion);

    this.element = element;
    this.textElement = textElement;
    this.liveRegion = liveRegion;
    this.typewriter = new Typewriter(
      (text) => {
        if (this.textElement !== null) {
          this.textElement.textContent = text;
          this.measure();
          this.reposition();
        }
      },
      this.options,
    );
  }

  say(text: string): Promise<void> {
    if (this.element === null || this.liveRegion === null || this.typewriter === null) {
      throw new Error('SpeechBubble must be mounted before it can speak.');
    }

    const speechId = this.speechId + 1;
    this.speechId = speechId;
    this.element.hidden = false;
    this.liveRegion.textContent = text;
    this.clearAutoAdvance();
    const speech = this.typewriter.play(text);
    this.scheduleAutoAdvance(speechId, text);
    return speech.then(() => {
      if (this.speechId === speechId) {
        this.clearAutoAdvance();
        this.hide();
      }
    });
  }

  follow(anchor: DOMRectReadOnly): void {
    this.anchor = anchor;
    if (this.element !== null && !this.element.hidden) {
      this.reposition();
    }
  }

  hide(): void {
    if (this.element !== null) {
      this.element.hidden = true;
    }
  }

  /** Advance the current line programmatically, used by story skip. */
  advance(): void {
    this.typewriter?.advance();
  }

  destroy(): void {
    this.clearAutoAdvance();
    this.typewriter?.destroy();
    this.element?.removeEventListener('click', this.handleAdvance);
    this.element?.remove();
    this.liveRegion?.remove();
    this.element = null;
    this.textElement = null;
    this.liveRegion = null;
    this.typewriter = null;
    this.anchor = null;
    this.speechId += 1;
    this.measuredWidth = 0;
    this.measuredHeight = 0;
  }

  private readonly handleAdvance = (): void => {
    this.typewriter?.advance();
  };

  private reposition(): void {
    if (this.element === null || this.anchor === null) {
      return;
    }

    const width = this.measuredWidth;
    const height = this.measuredHeight;
    const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
    const viewportHeight = document.documentElement.clientHeight || window.innerHeight;
    const centeredLeft = this.anchor.left + this.anchor.width / 2 - width / 2;
    const left = Math.min(
      Math.max(centeredLeft, this.margin),
      Math.max(this.margin, viewportWidth - width - this.margin),
    );
    const shouldFlip = this.anchor.top - height - this.gap < this.margin;
    const top = shouldFlip
      ? this.anchor.bottom + this.gap
      : this.anchor.top - height - this.gap;

    const classes = ['blob-bubble'];
    if (shouldFlip) classes.push('blob-bubble--below');
    if (this.options.tail === false) classes.push('blob-bubble--no-tail');
    this.element.className = classes.join(' ');
    this.element.style.left = `${Math.round(left)}px`;
    this.element.style.top = `${Math.round(Math.min(top, viewportHeight - height - this.margin))}px`;
    const tailLeft = Math.min(
      Math.max(this.anchor.left + this.anchor.width / 2 - left - 8, 4),
      Math.max(4, width - 20),
    );
    this.element.style.setProperty('--blob-tail-left', `${Math.round(tailLeft)}px`);
  }

  private measure(): void {
    if (this.element !== null) {
      this.measuredWidth = this.element.offsetWidth;
      this.measuredHeight = this.element.offsetHeight;
    }
  }

  private scheduleAutoAdvance(speechId: number, text: string): void {
    const delay = this.options.autoAdvance;
    if (typeof delay !== 'number' || !Number.isFinite(delay) || delay < 0) return;
    const typingDelay = this.options.reducedMotion ? 0 : nonNegative(this.options.characterDelay, 35);
    this.autoAdvanceTimer = setTimeout(() => {
      this.autoAdvanceTimer = null;
      if (this.speechId !== speechId) return;
      this.typewriter?.advance();
      this.typewriter?.advance();
    }, Array.from(text).length * typingDelay + delay);
  }

  private clearAutoAdvance(): void {
    if (this.autoAdvanceTimer !== null) {
      clearTimeout(this.autoAdvanceTimer);
      this.autoAdvanceTimer = null;
    }
  }

  private get gap(): number {
    return nonNegative(this.options.gap, DEFAULT_BUBBLE_GAP);
  }

  private get margin(): number {
    return nonNegative(this.options.margin, DEFAULT_VIEWPORT_MARGIN);
  }
}

function nonNegative(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback;
}
