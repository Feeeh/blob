export declare class DismissBehavior {
    private readonly storageKey;
    private readonly onDismiss;
    private readonly onRestore;
    private readonly restoreLabel;
    private chip;
    constructor(storageKey: string | undefined, onDismiss: () => void, onRestore: () => void, restoreLabel?: string);
    mount(host: HTMLElement): void;
    dismiss(): void;
    restore(): void;
    isDismissed(): boolean;
    destroy(): void;
    private setDismissed;
}
