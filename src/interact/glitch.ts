export class GlitchBehavior {
  private element: HTMLElement | null = null;
  private readonly timers = new Set<ReturnType<typeof setTimeout>>();

  enable(element: HTMLElement): void {
    this.disable();
    this.element = element;
    this.scheduleNextBurst();
  }

  disable(): void {
    for (const timer of this.timers) clearTimeout(timer);
    this.timers.clear();
    this.element?.classList.remove('blob-glitch');
    this.element = null;
  }

  private scheduleNextBurst(): void {
    this.after(2000, 7000, () => this.burst(120, 350, () => {
      if (Math.random() < 0.25) {
        this.after(60, 150, () => this.burst(80, 160, () => this.scheduleNextBurst()));
      } else {
        this.scheduleNextBurst();
      }
    }));
  }

  private burst(minimum: number, maximum: number, done: () => void): void {
    this.element?.classList.add('blob-glitch');
    this.after(minimum, maximum, () => {
      this.element?.classList.remove('blob-glitch');
      done();
    });
  }

  private after(minimum: number, maximum: number, callback: () => void): void {
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      callback();
    }, minimum + Math.random() * (maximum - minimum));
    this.timers.add(timer);
  }
}
