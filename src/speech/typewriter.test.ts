import { afterEach, describe, expect, it, vi } from 'vitest';
import { Typewriter } from './typewriter';

afterEach(() => {
  vi.useRealTimers();
});

describe('Typewriter', () => {
  it('reveals text one character at a time, then requires a second advance', async () => {
    vi.useFakeTimers();
    const updates: string[] = [];
    const typewriter = new Typewriter((text) => updates.push(text), { characterDelay: 10 });
    let resolved = false;
    const done = typewriter.play('hi').then(() => {
      resolved = true;
    });

    expect(updates).toEqual(['']);
    vi.advanceTimersByTime(10);
    expect(updates.at(-1)).toBe('h');
    typewriter.advance();
    expect(updates.at(-1)).toBe('hi');
    await Promise.resolve();
    expect(resolved).toBe(false);
    typewriter.advance();
    await done;
    expect(resolved).toBe(true);
  });

  it('renders immediately for reduced motion while still awaiting advance', async () => {
    const updates: string[] = [];
    const typewriter = new Typewriter((text) => updates.push(text), { reducedMotion: true });
    let resolved = false;
    const done = typewriter.play('hello').then(() => {
      resolved = true;
    });

    expect(updates).toEqual(['', 'hello']);
    await Promise.resolve();
    expect(resolved).toBe(false);
    typewriter.advance();
    await done;
  });

  it('resolves an interrupted line before beginning the next one', async () => {
    vi.useFakeTimers();
    const updates: string[] = [];
    const typewriter = new Typewriter((text) => updates.push(text));
    let firstResolved = false;
    const first = typewriter.play('first').then(() => {
      firstResolved = true;
    });

    const second = typewriter.play('second');
    await first;
    expect(firstResolved).toBe(true);
    typewriter.advance();
    typewriter.advance();
    await second;
    expect(updates.at(-1)).toBe('second');
  });

  it('catches up when timers fire late, as on a busy older phone', () => {
    vi.useFakeTimers();
    const updates: string[] = [];
    const typewriter = new Typewriter((text) => updates.push(text), { characterDelay: 10 });

    void typewriter.play('hello');
    // The main thread was blocked: wall time passed, the timer only fires now.
    vi.setSystemTime(Date.now() + 500);
    vi.advanceTimersByTime(10);

    expect(updates.at(-1)).toBe('hello');
  });

  it('keeps a surrogate-pair emoji together', () => {
    vi.useFakeTimers();
    const updates: string[] = [];
    const typewriter = new Typewriter((text) => updates.push(text), { characterDelay: 10 });

    void typewriter.play('👍');
    vi.advanceTimersByTime(10);

    expect(updates.at(-1)).toBe('👍');
  });
});
