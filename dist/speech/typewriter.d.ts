/** Reveals a line one code point at a time and waits for an explicit advance. */
export type TypewriterState = 'idle' | 'typing' | 'waiting';
export interface TypewriterOptions {
    characterDelay?: number;
    reducedMotion?: boolean;
}
export declare class Typewriter {
    private readonly onUpdate;
    private readonly characterDelay;
    private readonly reducedMotion;
    private state;
    private characters;
    private visibleCount;
    private timer;
    private resolveAdvance;
    constructor(onUpdate: (text: string) => void, options?: TypewriterOptions);
    get isActive(): boolean;
    /** Start a new line. The promise resolves only after the visitor advances it. */
    play(text: string): Promise<void>;
    /** First advance finishes typing; the next advance resolves the current line. */
    advance(): void;
    destroy(): void;
    private scheduleNextCharacter;
    private finishTyping;
    private finish;
    private clearTimer;
}
