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
    /** completed is false when the story was skipped rather than played through. */
    onEnd?(completed: boolean): void;
    /** Called when a step's user-supplied run() throws; the story continues. */
    onRunError?(error: unknown): void;
}
export declare class StoryEngine {
    private readonly host;
    private readonly steps;
    private running;
    private paused;
    private skipping;
    private resume;
    constructor(host: StoryHost, steps: readonly StoryStep[]);
    play(): Promise<void>;
    pause(): void;
    skip(): void;
    private waitIfPaused;
}
