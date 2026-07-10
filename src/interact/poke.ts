export class PokeBehavior {
  constructor(private readonly onPoke: () => void) {}

  private target: HTMLElement | null = null;
  private readonly handleClick = (): void => this.onPoke();

  enable(target: HTMLElement): void {
    this.disable();
    this.target = target;
    target.addEventListener('click', this.handleClick);
  }

  disable(): void {
    this.target?.removeEventListener('click', this.handleClick);
    this.target = null;
  }
}
