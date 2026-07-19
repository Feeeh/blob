/**
 * Pixel-art speech bubble anchored above Blob. Story text is always written
 * through textContent and mirrored once to a polite live region.
 */
export interface SpeechBubbleOptions {
    reducedMotion?: boolean;
    characterDelay?: number;
    gap?: number;
    margin?: number;
    tail?: boolean;
    autoAdvance?: number;
    ariaLabel?: string;
    /** Extra class(es) kept on the bubble element for user CSS overrides. */
    className?: string;
}
export declare class SpeechBubble {
    private readonly options;
    private element;
    private textElement;
    private liveRegion;
    private typewriter;
    private anchor;
    private speechId;
    private measuredWidth;
    private measuredHeight;
    private currentTextLength;
    private autoAdvanceTimer;
    constructor(options?: SpeechBubbleOptions);
    get isSpeaking(): boolean;
    /** Viewport rect of the visible bubble, or null while hidden. */
    get visibleRect(): DOMRectReadOnly | null;
    mount(host: HTMLElement): void;
    say(text: string): Promise<void>;
    follow(anchor: DOMRectReadOnly): void;
    hide(): void;
    /** Advance the current line programmatically, used by story skip. */
    advance(): void;
    destroy(): void;
    private readonly handleAdvance;
    private reposition;
    private measure;
    /**
     * The dwell starts only once the line has actually finished typing, so a
     * slow device (late timers) can never auto-dismiss a half-typed phrase.
     */
    private readonly handleTypingComplete;
    private clearAutoAdvance;
    private get gap();
    private get margin();
}
