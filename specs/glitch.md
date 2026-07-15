# Spec: `glitch` option — random corrupted-signal flicker

Add an opt-in "glitch" look to Blob: at random moments, for a fraction of a
second, the whole character (body in any state — idle, moving, attached,
circling — plus the speech bubble) jerks uncontrollably and shows the classic
chromatic-aberration smudge (red / purple / yellow fringes). Fast, random,
and SUBTLE — a haunted-electronics vibe, not a seizure. Between bursts Blob
looks completely normal.

TypeScript strict, no `any`, no new dependencies, smallest reasonable diff.
`npm run typecheck` and `npm test` must pass. Do NOT refactor anything else.

## Approach (already decided — follow it)

Everything Blob draws lives inside one element: `div.blob-visual`
(`src/index.ts`, `position: fixed; inset: 0`). The canvas/svg body, the speech
bubble, the hit target and the dismiss button are all its children. So the
whole effect is: a small behavior class toggles a CSS class on that one
element at random intervals, and CSS keyframes do the visual work. No physics
changes, no renderer changes, no per-frame JS.

## 1. Public API — `src/types.ts`

Add to `BlobOptions`:

```ts
/** Randomly corrupt Blob's visuals with brief glitch bursts. Default: false. */
glitch?: boolean;
```

Nothing else changes in the public contracts.

## 2. Behavior — new file `src/interact/glitch.ts`

Follow the shape of the existing `src/interact/poke.ts` / `drag.ts` behaviors:
a tiny class, `enable(element)` / `disable()`, no globals.

```ts
export class GlitchBehavior {
  enable(element: HTMLElement): void;
  disable(): void; // removes the class, clears all timers; safe to call twice
}
```

Scheduling, all via `setTimeout` + `Math.random()`:

- Wait a random 2000–7000 ms.
- Burst: add class `blob-glitch` to the element for a random 120–350 ms,
  then remove it.
- Roughly 1 in 4 bursts should be a "double tap": after the class is removed,
  wait a short random 60–150 ms and burst once more (shorter, 80–160 ms)
  before scheduling the next long wait. This reads as signal corruption
  rather than a metronome.
- Loop forever until `disable()`.

`disable()` must clear every pending timer and remove the class so nothing
fires after `destroy()`.

## 3. Styles — `src/styles.css`

One keyframes rule + one class. Requirements:

- Discrete jumps, not smooth motion: use `steps(1, end)` (or equivalently
  several hard-cut keyframes). Classic glitch is stepped.
- Jitter: `transform: translate(...)` offsets in the ±1–4 px range, different
  direction each keyframe. Optionally a tiny `skewX` (≤ 0.6deg) on one or two
  frames. Subtle — never more than ~4 px.
- Color smudge: `filter: drop-shadow(...)` fringes in the keyframes, e.g.
  red `rgba(255, 0, 70, 0.5)` offset one way, purple `rgba(140, 60, 255, 0.5)`
  the opposite way, yellow `rgba(255, 220, 0, 0.4)` vertically. Offsets
  1.5–3 px, alpha ≤ 0.55. Vary which fringes are visible across keyframes so
  the smudge flickers.
- Fast: full cycle around 140–200 ms, `infinite` (the class is only present
  for the burst, so it plays ~1–2 cycles).

```css
.blob-visual.blob-glitch {
  animation: blob-glitch-burst 160ms steps(1, end) infinite;
}
```

Notes:

- Applying `filter`/`transform` to `.blob-visual` makes it a containing block
  for its `position: fixed` children — harmless here because `.blob-visual`
  is itself fixed at `inset: 0`, so child coordinates are unchanged. Do not
  "fix" this.
- The existing `@media (prefers-reduced-motion: reduce)` rule at the bottom
  of `styles.css` already kills all animations inside `.blob-layer`; leave it
  as the last rule so it keeps winning.

## 4. Wiring — `src/index.ts`

- Create the behavior next to the existing `poke` / `drag` wiring:
  enable it on `visualLayer` only when `options.glitch === true` and
  `reducedMotion` is false (reduced motion always wins).
- `destroy()` must call `disable()` (alongside `poke.disable()` /
  `drag.disable()`).
- Do not touch the render loop, `SoftBody`, renderers, or `SpeechBubble`.

## 5. Demo — `demo/character.ts`

Add `glitch: true` to the character so the effect is visible in `npm run dev`.

## 6. Tests

New `src/interact/glitch.test.ts` (Vitest, `vi.useFakeTimers()`, fake element
with a real `classList` — jsdom or a minimal stub, whichever the neighboring
tests use):

- After `enable`, no class before the first random delay elapses; class
  present during a burst; class gone after the burst ends.
- `disable()` mid-burst removes the class and no timers fire afterwards
  (`vi.runAllTimers()` changes nothing).
- Mock `Math.random` where determinism is needed.

Plus one case in `src/index.test.ts` if the existing `installDom()` harness
makes it cheap: `createBlob({ glitch: true })` under reduced motion never adds
the class. If the harness fights you, cover the reduced-motion gate in
`glitch.test.ts` instead by asserting the wiring condition — but there must
be a test somewhere that reduced motion disables glitching.

## Definition of done

- `npm run typecheck` and `npm test` pass.
- Changes limited to: `src/types.ts`, `src/interact/glitch.ts` (new),
  `src/styles.css`, `src/index.ts`, `demo/character.ts`, tests.
- With `glitch` unset or `false`, zero behavioral difference (no class, no
  timers created).
