export declare class GlitchBehavior {
    private element;
    private readonly timers;
    enable(element: HTMLElement): void;
    disable(): void;
    private scheduleNextBurst;
    private burst;
    private after;
}
