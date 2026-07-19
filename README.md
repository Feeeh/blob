# Blob

A zero-dependency TypeScript companion for websites. Blob idles in the bottom-right corner, can explain a page through a story, attach to targets, and form a ring around a section.

## Development

```sh
npm install
npm run dev
npm run typecheck
npm test
npm run build
```

The development server serves the only demo from `demo/`. It resets its local tour state on startup, so changes to `demo/character.ts` replay immediately. `npm run build` emits the ESM, UMD, and declaration files in `dist/`.

## Create A Character

Create one `.ts` or `.js` file and import it where the site starts. A character is only a plain options object; there is no registry, class, or build-time convention to learn.

```ts
// src/characters/guide.ts
import { defineBlobCharacter } from 'blob';

export default defineBlobCharacter({
  body: { color: '#0ea5e9', size: 48, points: 32 },
  physics: {
    stiffness: 220,
    bobAmplitude: 4,
    breatheAmplitude: 0.04,
    pokeStrength: 240,
  },
  bubble: {
    background: '#07111f',
    color: '#dbeafe',
    borderColor: '#38bdf8',
    borderWidth: 3,
    shape: 'rounded', // square | rounded | circle
    borderRadius: 14,
    padding: 14,
    fontFamily: 'system-ui, sans-serif',
    autoAdvance: 800,
    tail: true,
  },
  attachment: { side: 'left', gap: 10 },
  morph: {
    shape: 'rounded', // circle | square | rectangle | rounded
    padding: 14,
    radius: 20,
    strokeColor: '#38bdf8',
    strokeWidth: 8,
    lineCap: 'round',
    lineJoin: 'round',
  },
  autoStart: true,
  story: [
    { say: 'Welcome.' },
    { attachTo: '#main-nav', attach: { side: 'bottom' }, say: 'Start here.' },
    {
      circle: '#projects',
      morph: { shape: 'rectangle', radius: 0, strokeColor: '#f472b6', strokeWidth: 5 },
      say: 'These are the projects.',
    },
    { detach: true },
  ],
  script(blob) {
    blob.on('end', () => void blob.say('Tour complete.'));
    return () => console.log('Guide removed');
  },
});
```

```ts
import { createBlob } from 'blob';
import guide from './characters/guide';

createBlob(guide);
```

The same object works in JavaScript—omit `defineBlobCharacter` if you do not need TypeScript autocomplete. `physics: false` makes movement immediate and static; `bubble: false` makes `say()` and story speech continue without showing a bubble.

Every bubble visual is an option: `background`, `color`, `borderColor`, `borderWidth`, `borderRadius`/`shape`, `padding`, `fontFamily`, `fontSize`, `lineHeight`, `maxWidth` (automatically clamped to the viewport), `shadow`, and `tail`. When the built-in knobs are not enough, pass `bubble: { className: 'my-bubble' }` and restyle the element entirely from your own stylesheet.

For a one-off companion, pass the same object directly to `createBlob({ ... })`; the existing `data-blob-*` story attributes remain a no-script story option.

## Story Steps

Steps run in this order: `sleep`, `run`, `moveTo`, `attachTo`, `circle`, `say`, then `detach`. `run` is an optional `() => void | Promise<void>` callback for page actions (scrolling, opening UI) that must happen before Blob travels within the same step.

```html
<section data-blob-order="1" data-blob-action="circle" data-blob-say="Featured work" data-blob-detach>
</section>
```

Data-attribute steps append after `options.story`.

## Direct Controls And Renderers

`attachTo()` and `circle()` accept the same per-call overrides as story steps, so a script can change targets, shape, radius, stroke color, and width at any time. Built-in renderers are `canvas2d`, `svg`, and `css`; all three support `circle()` — the CSS renderer draws the ring as a hollow bordered box.

A custom renderer is the escape hatch for a fully bespoke character. It receives a `SoftBodyState` every frame, including perimeter points and morph stroke settings:

```ts
const renderer = { mount(host: HTMLElement) {}, render(state) {}, destroy() {} };
createBlob({ body: { color: '#f97316' }, renderer });
```

## Accessibility

Blob honors reduced motion, mirrors speech to `aria-live="polite"`, provides a keyboard-focusable hit target, and includes an accessible persisted restore chip.

## Status

Source: [github.com/Feeeh/blob](https://github.com/Feeeh/blob). The package is private and not published to npm.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). Blob is GPL-3.0-only.
