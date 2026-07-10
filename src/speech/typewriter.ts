/** Reveals a line one code point at a time and waits for an explicit advance. */

export type TypewriterState = 'idle' | 'typing' | 'waiting';

export interface TypewriterOptions {
  characterDelay?: number;
  reducedMotion?: boolean;
}

export class Typewriter {
  private readonly characterDelay: number;
  private readonly reducedMotion: boolean;
  private state: TypewriterState = 'idle';
  private characters: string[] = [];
  private visibleCount = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private resolveAdvance: (() => void) | null = null;

  constructor(
    private readonly onUpdate: (text: string) => void,
    options: TypewriterOptions = {},
  ) {
    this.characterDelay = positiveDelay(options.characterDelay, 35);
    this.reducedMotion = options.reducedMotion ?? false;
  }

  get isActive(): boolean {
    return this.state !== 'idle';
  }

  /** Start a new line. The promise resolves only after the visitor advances it. */
  play(text: string): Promise<void> {
    this.finish();
    // Array.from keeps surrogate pairs intact; full grapheme segmentation can follow later.
    this.characters = Array.from(text);
    this.visibleCount = 0;
    this.onUpdate('');

    return new Promise((resolve) => {
      this.resolveAdvance = resolve;
      if (this.reducedMotion || this.characters.length === 0) {
        this.finishTyping();
        return;
      }

      this.state = 'typing';
      this.scheduleNextCharacter();
    });
  }

  /** First advance finishes typing; the next advance resolves the current line. */
  advance(): void {
    if (this.state === 'typing') {
      this.finishTyping();
      return;
    }
    if (this.state === 'waiting') {
      this.finish();
    }
  }

  destroy(): void {
    this.finish();
    this.characters = [];
    this.visibleCount = 0;
  }

  private scheduleNextCharacter(): void {
    this.timer = setTimeout(() => {
      this.timer = null;
      this.visibleCount += 1;
      this.onUpdate(this.characters.slice(0, this.visibleCount).join(''));

      if (this.visibleCount >= this.characters.length) {
        this.finishTyping();
        return;
      }
      this.scheduleNextCharacter();
    }, this.characterDelay);
  }

  private finishTyping(): void {
    this.clearTimer();
    this.visibleCount = this.characters.length;
    this.onUpdate(this.characters.join(''));
    this.state = 'waiting';
  }

  private finish(): void {
    this.clearTimer();
    this.state = 'idle';
    const resolve = this.resolveAdvance;
    this.resolveAdvance = null;
    resolve?.();
  }

  private clearTimer(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}

function positiveDelay(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback;
}
