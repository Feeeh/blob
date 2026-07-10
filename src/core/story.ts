import type { BlobAttachmentOptions, BlobMorphOptions, BlobTarget, StoryStep } from '../types';

export interface StoryHost {
  sleep(ms: number): Promise<void>;
  say(text: string): Promise<void>;
  attachTo(target: BlobTarget, options?: BlobAttachmentOptions): Promise<void>;
  circle(target: BlobTarget, options?: BlobMorphOptions): Promise<void>;
  moveTo(x: number, y: number): Promise<void>;
  detach(): Promise<void>;
  skipSpeech?(): void;
  onStep?(step: StoryStep): void;
  onEnd?(): void;
}

export class StoryEngine {
  private running = false;
  private paused = false;
  private skipping = false;
  private resume: (() => void) | null = null;

  constructor(private readonly host: StoryHost, private readonly steps: readonly StoryStep[]) {}

  async play(): Promise<void> {
    if (this.running) {
      this.paused = false;
      this.resume?.();
      return;
    }
    this.running = true;
    this.skipping = false;
    try {
      for (const step of this.steps) {
        await this.waitIfPaused();
        if (this.skipping) break;
        this.host.onStep?.(step);
        if (step.sleep !== undefined) await this.host.sleep(step.sleep);
        if (this.skipping) break;
        if (step.moveTo !== undefined) await this.host.moveTo(step.moveTo.x, step.moveTo.y);
        if (this.skipping) break;
        if (step.attachTo !== undefined) await this.host.attachTo(step.attachTo, step.attach);
        if (this.skipping) break;
        if (step.circle !== undefined) await this.host.circle(step.circle, step.morph);
        if (this.skipping) break;
        if (step.say !== undefined) await this.host.say(step.say);
        if (this.skipping) break;
        if (step.detach) await this.host.detach();
      }
      if (!this.skipping) this.host.onEnd?.();
    } finally {
      this.running = false;
      this.paused = false;
      this.resume = null;
    }
  }

  pause(): void {
    if (this.running) this.paused = true;
  }

  skip(): void {
    this.skipping = true;
    this.paused = false;
    this.host.skipSpeech?.();
    this.resume?.();
  }

  private waitIfPaused(): Promise<void> {
    if (!this.paused) return Promise.resolve();
    return new Promise((resolve) => {
      this.resume = resolve;
    });
  }
}
