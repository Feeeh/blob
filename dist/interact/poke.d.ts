export declare class PokeBehavior {
    private readonly onPoke;
    constructor(onPoke: () => void);
    private target;
    private readonly handleClick;
    enable(target: HTMLElement): void;
    disable(): void;
}
