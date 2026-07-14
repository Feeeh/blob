# Reduced-motion warning — design

Date: 2026-07-14. Status: approved (option A).

## Problem

When the visitor's OS/browser reports `prefers-reduced-motion: reduce`, Blob
disables all animation by design (`respectReducedMotion` defaults to `true`).
Nothing tells the visitor or the integrating developer why Blob is static.

## Design

Two warnings, both only when the reduction comes from the media query — never
when the developer chose `physics: false` or set `respectReducedMotion: false`.

1. **Developer**: `console.warn` once inside `createBlob()` explaining that
   reduced motion is active, Blob will position instantly without animation,
   and that `respectReducedMotion: false` overrides it.
2. **Visitor**: Blob speaks a notice via the existing speech bubble right after
   mount, when the bubble is enabled and Blob is not dismissed. New
   `BlobOptions.reducedMotionNotice?: string | false`:
   - default text: `"Animations are off to respect your reduced-motion setting, so I'll keep still."`
   - custom string localizes it; `false` disables the bubble notice.
   - Later speech (story or `say()`) replaces it naturally via the bubble's
     `speechId` mechanism. Shown every page load; no storage.

## Tests

- Notice spoken when `matchMedia` matches; suppressed by `reducedMotionNotice: false`,
  `bubble: false`, `respectReducedMotion: false`, and `physics: false`.
- `console.warn` fired only for the media-query-driven case.
