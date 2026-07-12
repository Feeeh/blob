export class DismissBehavior {
  private chip: HTMLButtonElement | null = null;

  constructor(
    private readonly storageKey = 'blob',
    private readonly onDismiss: () => void,
    private readonly onRestore: () => void,
    private readonly restoreLabel = 'Restore Blob',
  ) {}

  mount(host: HTMLElement): void {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'blob-restore-chip';
    chip.textContent = 'B';
    chip.setAttribute('aria-label', this.restoreLabel);
    chip.hidden = !this.isDismissed();
    chip.addEventListener('click', () => this.restore());
    host.append(chip);
    this.chip = chip;
  }

  dismiss(): void {
    this.setDismissed(true);
    if (this.chip !== null) this.chip.hidden = false;
    this.onDismiss();
  }

  restore(): void {
    this.setDismissed(false);
    if (this.chip !== null) this.chip.hidden = true;
    this.onRestore();
  }

  isDismissed(): boolean {
    try { return window.localStorage.getItem(`${this.storageKey}:dismissed`) === 'true'; } catch { return false; }
  }

  destroy(): void {
    this.chip?.remove();
    this.chip = null;
  }

  private setDismissed(value: boolean): void {
    try { window.localStorage.setItem(`${this.storageKey}:dismissed`, String(value)); } catch {}
  }
}
