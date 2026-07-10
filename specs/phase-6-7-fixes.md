# Spec: Phase 6 & 7 review fixes

Two bugs found reviewing phases 6 and 7 against `blob.md`. Fix both with the
smallest possible diffs. Do NOT refactor anything else. TypeScript strict, no
`any`, no new dependencies. All existing tests must keep passing
(`npm run typecheck` && `npm test`).

## Fix 1 — `skip()` must actually end the story (Phase 6)

File: `src/core/story.ts` (and its host wiring in `src/index.ts` is already
correct — `onEnd` sets the `:story-played` localStorage flag and emits `end`).

Problem: in `StoryEngine.play()`, when `this.skipping` becomes true the loop
breaks and `onEnd` is **not** called (`if (!this.skipping) this.host.onEnd?.();`).
Consequences:

- The `end` event never fires after `blob.skip()`.
- The "story played" flag is never written, so `autoStart` replays a
  skipped tour on the next visit.
- Blob stays attached/circling wherever it was, even though `blob.md`
  documents `skip()` as "jump to end of story".

Required behavior: when a running story is skipped, the engine must
`await this.host.detach()` (releases any attachment/ring and sends Blob home)
and then call `this.host.onEnd?.()` — i.e. `onEnd` fires exactly once whether
the story finishes naturally or is skipped. Do not detach on natural
completion (the story's own steps decide that). Guard so `detach` isn't
called if the story never ran.

Add a Vitest case in `src/core/story.test.ts`: skipping mid-story calls
`detach` once and `onEnd` once.

## Fix 2 — drag during a story movement step deadlocks the story (Phase 7)

File: `src/index.ts`.

Problem: story steps await `waitForMotion()`, which parks a resolver in
`motionWaiter` until `finishMotion()` / the idle-return branch in `render()`
resolves it. The state machine allows `moving → dragged`, so the user can
grab Blob mid-flight during an `attachTo` / `circle` / `moveTo` / `detach`
step. The drag-end callback (`DragBehavior`'s `onEnd`, wired at
`src/index.ts` around line 521) resets `motion` to
`{ kind: 'idle', landed: false, ... }` but never resolves `motionWaiter`,
and afterwards the idle-return branch in `render()` requires
`state.name === 'moving'` — which is false because the state went
`dragged → idle`. Result: the story's `await` never resolves; the story is
permanently stuck.

Required behavior: when a drag ends, any pending motion waiter must be
resolved so the story continues with its next step (Blob has been released
and springs home; the interrupted step is simply abandoned). The existing
`resolveMotion()` helper does exactly this — call it at the appropriate point
in the drag-end path. Also consider the drag-start path: the anchor is
released there; make sure no `onRect` callback from a stale anchor can
re-park a waiter afterwards (the `activeAnchor !== anchor` guard should
already cover this — verify, don't rewrite).

Add a Vitest case in `src/index.test.ts` using the existing `installDom()`
harness: start a motion (e.g. `attachTo`), simulate the drag interrupting it
(you can reach the drag callbacks through the `pointerdown`/`pointerup`
listeners registered on the hit-target fake element, or by exporting nothing
new — use the listeners captured by the fake's `addEventListener` mock), end
the drag, and assert that a promise awaiting the motion resolves. If wiring
pointer events through the fake DOM proves too brittle, an equivalent test at
whatever seam is testable is acceptable — but there must be a regression test
proving a pending story motion resolves after a drag ends.

## Definition of done

- `npm run typecheck` passes.
- `npm test` passes, including the two new regression tests.
- No changes outside `src/core/story.ts`, `src/index.ts`, and the two test
  files.
