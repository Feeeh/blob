# Blob — Design & Implementation Plan

> A small purple soft-body character that lives on your website, speaks in pixelated
> speech bubbles, and attaches to / circles the elements you point it at.
> Open source (GPL-3.0), framework-agnostic, written in TypeScript.

---

## 1. Concept

Blob idles at the **bottom-right** of the screen, gently bobbing up and down.
When the visitor clicks it (or when `autoStart` is enabled), it plays a **story**:

1. It introduces the website — what it is, and shows off how it attaches to and
   detaches from things.
2. It presents what's included on the site and who it belongs to (portfolio use case).
3. Its whole body **expands and retracts**: to present an element, Blob stretches
   into a ring that wraps around it, then snaps back into a ball.

The story, the character's look, and every behavior are configurable — people are
meant to fork it, re-skin it, and rewrite the script.

## 2. Architecture

Embeddable library, zero runtime dependencies. One `createBlob(options)` entry point.

```
src/
├── index.ts             Public API: createBlob(), re-exported types
├── types.ts             BlobOptions, StoryStep, Renderer, events — ALL fields optional
├── core/
│   ├── state.ts         State machine: guarded body transitions; drag interrupts all visible states except circling
│   ├── story.ts         Story engine: sequential step queue (say, attachTo, circle, detach, sleep, moveTo)
│   ├── data-attrs.ts    Compiles data-blob-* HTML attributes into StoryStep[]
│   └── anchor.ts        Tracks target elements through scroll/resize (ResizeObserver + rAF)
├── physics/
│   ├── spring.ts        Damped spring — drives ALL motion (position, points, squish)
│   └── softbody.ts      Ring of ~16 perimeter points around a center; each point is a spring
├── renderers/
│   ├── renderer.ts      Renderer interface — pluggable
│   ├── canvas2d.ts      DEFAULT. Metaball/goo pass over the soft-body curve. Organic.
│   ├── svg.ts           Alternate (phase 8): smooth path through the points. Crisp, themeable.
│   └── css.ts           Alternate (phase 8): border-radius morph. Simplest, can't wrap elements.
├── speech/
│   ├── bubble.ts        Pixel-art DOM bubble anchored above Blob; mirrors text to an aria-live region
│   └── typewriter.ts    Letter-by-letter reveal; click fast-forwards, then advances
├── interact/
│   ├── drag.ts          Drag Blob anywhere; it springs back home on release
│   ├── poke.ts          Click idle Blob → squish/jiggle reaction
│   └── dismiss.ts       Minimize/hide Blob; state persisted in localStorage; restore chip
└── styles.css           Bubble + pixel font styles, injected at runtime (self-hosted font in v1)
```

**Key design rules**

- **Speech is orthogonal to body state.** Blob can speak while idle, attached, or
  circling — `speaking` is a parallel channel, not a state-machine node.
- **Renderers are dumb.** They receive the soft-body point ring each frame and draw
  it. All physics/behavior lives outside, so a custom renderer is ~50 lines.
- **Everything optional.** `createBlob()` with no arguments produces an idle bobbing
  blob that does nothing else.
- **No `innerHTML` with story text — ever.** Bubble text is set via `textContent`
  (story strings may come from page authors, but XSS-safe by construction).

## 3. Public API

```ts
import { createBlob } from 'blob'; // npm name TBD at publish time (phase 9)

const blob = createBlob({
  renderer: 'canvas2d',      // 'canvas2d' | 'svg' | 'css' | custom Renderer instance
  color: '#8b5cf6',          // Blob's body color
  size: 48,                  // resting radius, px
  autoStart: false,          // false = wait for a click on Blob
  draggable: true,
  dismissible: true,
  respectReducedMotion: true,
  reducedMotionNotice: "…",  // bubble line spoken when reduced motion is active; false to silence
  storageKey: 'blob',        // localStorage namespace (dismiss + "story already played")
  zIndex: 2147483000,        // layer above the page content
  story: [
    { sleep: 1200 },
    { say: "Hi! I'm Blob. Click me and I'll show you around." },
    { attachTo: '#main-nav', say: 'This menu takes you everywhere.' },
    { circle: '#projects',   say: 'And these are the projects!' },
    { detach: true },
    { say: 'That’s the tour. Poke me anytime!' },
  ],
});

blob.start();        // play the story (no-op if already playing)
blob.pause();
blob.skip();         // jump to end of story
blob.say('...');     // one-off line outside the story
blob.moveTo({ x: 200, y: 300 });
blob.attachTo(el);   // imperative controls mirror the step types
blob.circle(el);
blob.detach();
blob.destroy();      // remove everything from the DOM

blob.on('step', (step) => { ... });   // events: 'start' | 'step' | 'say' | 'attach'
blob.off('step', handler);            //         'circle' | 'detach' | 'end' | 'dismiss'
                                       //         'warn'
```

### Story steps

Every field of a `StoryStep` is optional and fields combine —
`{ attachTo: '#nav', say: 'Menus!', sleep: 500 }` means: wait 500 ms, travel to
`#nav`, attach, then speak.

| Field      | Type                       | Meaning                                   |
| ---------- | -------------------------- | ----------------------------------------- |
| `sleep`    | `number` (ms)              | Wait before executing the rest of the step |
| `say`      | `string`                   | Speak via typewriter bubble; waits for click-to-advance |
| `attachTo` | `string \| HTMLElement`    | Travel to the element and stick to its edge |
| `circle`   | `string \| HTMLElement`    | Expand body into a ring around the element |
| `detach`   | `boolean`                  | Release current target, return home       |
| `moveTo`   | `{ x, y }`                 | Travel to a viewport coordinate           |

### Data-attribute API (alternative, no JS required)

```html
<nav data-blob-order="1" data-blob-say="This menu takes you everywhere." data-blob-action="attach">
<section id="projects" data-blob-order="2" data-blob-say="My work!" data-blob-action="circle" data-blob-detach>
```

- `data-blob-order` — sequence position (number)
- `data-blob-say` — bubble text
- `data-blob-action` — `attach` (default) or `circle`
- `data-blob-sleep` — ms to wait before the step
- `data-blob-detach` — detach after this step

`data-attrs.ts` compiles these into `StoryStep[]`. If a config `story` is also
provided, data-attribute steps are **appended after** the config steps.

## 4. How "circle an element" works

The soft body is a ring of ~16 points, each attached by a damped spring to a
**rest position**. Behaviors only ever change rest positions:

- **Idle:** rest positions form a circle of radius `size`; a slow sine offset per
  point makes Blob breathe/wobble, plus a vertical bob of the whole center.
- **Circle an element:** the target's `getBoundingClientRect()` plus padding is
  converted to a rounded-rect outline; each point's rest position becomes its slot
  on that outline. The springs do the rest — Blob visibly *expands* into a ring
  hugging the element. `detach` restores the circular rest positions and it
  *retracts* back into a ball.
- **Attach:** center travels (spring) to the element's nearest edge; landing
  overshoot gives a natural squish. `anchor.ts` re-feeds target rects every frame
  while scrolling/resizing so Blob stays glued.

The Canvas 2D renderer draws a smooth closed curve (Catmull-Rom through the points)
and applies a goo pass (blur + alpha threshold) for the organic metaball look.

## 5. Accessibility & quality bars

- `prefers-reduced-motion`: no bobbing/goo/travel animation — Blob repositions
  instantly and still speaks. Overridable via `respectReducedMotion: false`. On
  mount it warns the developer via `console.warn` and speaks a short notice to
  the visitor (customize or silence with `reducedMotionNotice`).
- Bubble text mirrored to a visually-hidden `aria-live="polite"` region.
- Blob is a `button` (keyboard focusable); Enter/Space = click. Dismiss is honored
  across visits (localStorage).
- TypeScript `strict`, zero runtime deps, Vitest unit tests for all pure logic
  (springs, soft-body targets, story queue, data-attr compiler).
- Demo uses Tailwind + Google Fonts via CDN for convenience; the **library** injects
  its own self-hosted pixel font so consumers make no third-party requests.

---

## 6. Implementation plan — step by step

Each phase ends with something visible/testable. Do them in order.

### Phase 0 — Tooling ✅ (skeleton committed, Claude reviewed)
- [x] `git init`, GPL-3.0 `LICENSE`, `.gitignore`
- [x] `package.json` (private until publish), `tsconfig.json` (strict), `vite.config.ts`
- [x] Skeleton files for every module with typed stubs
- [x] Demo page with inline **placeholder blob** (to be replaced in phase 2)
- [x] `npm install` && verify: `npm run dev` serves `demo/`, `npm run typecheck` passes

### Phase 1 — Core types & state machine (Claude reviewed)
- [x] Finalize `types.ts` (options, steps, events, Renderer contract)
- [x] Implement `core/state.ts` transitions + guards (e.g. can't drag while circling)
- [x] Vitest: every legal/illegal transition
- **Done when:** `npm test` green; types compile with no `any`.

### Phase 2 — Canvas renderer + idle blob (first real visual, Claude reviewed)
- [x] `physics/spring.ts` (critically-damped spring, dt-based, frame-rate independent)
- [x] `physics/softbody.ts` (point ring, rest-position API, breathe + bob offsets)
- [x] `renderers/canvas2d.ts` (DPR-aware canvas, Catmull-Rom curve, goo pass)
- [x] rAF loop with visibility pause; `prefers-reduced-motion` path
- [x] Wire into demo, **delete the placeholder script** from `demo/index.html`
- **Done when:** organic purple blob bobs at bottom-right of the demo.

### Phase 3 — Speech bubble & typewriter (Claude reviewed)
- [x] `speech/bubble.ts`: pixel-bordered bubble positioned above Blob, flips when near edges
- [x] `speech/typewriter.ts`: reveal timer; click = fast-forward, second click = advance
- [x] `styles.css` + self-hosted pixel font; aria-live mirror
- **Done when:** `blob.say('hi')` types out text; click-through works; screen reader announces.

### Phase 4 — Movement & anchoring (Claude reviewed)
- [x] `core/anchor.ts`: resolve selector/element, track rect via ResizeObserver + scroll/rAF
- [x] `moveTo` / `attachTo` / `detach` behaviors on the soft body (travel spring + landing squish)
- [x] Handle target disappearing from DOM (graceful detach + `warn` event)
- **Done when:** Blob travels to `#main-nav`, sticks while you scroll, returns home on detach.

### Phase 5 — Expand & circle (Claude reviewed)
- [x] Rounded-rect outline sampler (rect + padding → N evenly-spaced points)
- [x] `circle` behavior: remap rest positions, expand/retract choreography
- [x] Keep tracking the rect while circling (scroll/resize)
- [x] Bubble repositions to sit outside the ring while circling
- **Done when:** Blob wraps around the demo's projects grid and snaps back on detach.

### Phase 6 — Story engine + data-attributes (Claude reviewed — skip() end-event fix applied)
- [x] `core/story.ts`: async step queue; `sleep`; `say` waits for advance; skip/pause/resume
- [x] Preserve the state invariant: target changes route through `moving`, even at zero distance
- [x] `autoStart` + "already played" flag in localStorage
- [x] `core/data-attrs.ts` compiler + merge rule (append after config story)
- [x] Events (`start`, `step`, `end`, …) via a tiny typed emitter
- [x] Vitest: queue ordering, sleep timing (fake timers), data-attr parsing
- **Done when:** the full demo tour plays end-to-end from `demo/demo.ts`.

### Phase 7 — Interactions (Claude reviewed — drag/story deadlock fix applied)
- [x] Click idle Blob = start story (demo default); click while speaking = advance
- [x] `interact/poke.ts`: squish/jiggle impulse on the soft body
- [x] `interact/drag.ts`: pointer capture, drag outside circling, then transition to idle and spring back home
- [x] `interact/dismiss.ts`: minimize to a small restore chip; persisted; ARIA labels
- **Done when:** all four interactions work on the demo without breaking a running story.

### Phase 8 — Alternate renderers (Claude reviewed)
- [x] `renderers/svg.ts`: same point ring → smooth `<path>`, CSS-themeable
- [x] `renderers/css.ts`: single div, border-radius morph (documented: no circling — falls back to attach)
- [x] Renderer conformance test: all renderers implement the contract
- **Done when:** demo has a renderer switcher and all three run.

### Phase 9 — Polish & release (In progress)
- [x] Theming docs: colors, size, font, custom renderer guide, "write your own story" guide
- [x] README and CONTRIBUTING.md (GIF capture remains external)
- [x] Production demo build (`demo-dist/`) alongside the library build
- [ ] Decide npm package name, remove `"private": true`, `npm publish` (ESM + UMD builds)
- [ ] GitHub repo, CI (typecheck + tests), demo deployed to GitHub Pages
- **Done when:** `npm install <name>` + 5 lines of code = working Blob on any site.

---

## 7. Testing strategy

- **Unit (Vitest):** springs (converge, frame-rate independent), soft-body rest-position
  math (circle + rounded-rect sampler), story queue (ordering, sleep, skip), data-attr
  compiler, state-machine transitions.
- **Manual/E2E:** the demo page is the living test — every phase's "done when" is
  verified there. Optional Playwright smoke test in phase 9.

## 8. Out of scope (v1)

Audio blips, multiple simultaneous blobs, React/Vue wrapper packages, i18n plumbing
(story strings are already author-supplied), mobile touch-drag physics tuning beyond
basics. All welcome as community contributions after v1.
