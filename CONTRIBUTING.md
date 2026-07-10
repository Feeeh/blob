# Contributing

## Setup

```sh
npm install
npm run typecheck
npm test
npm run build
```

Use `npm run dev` to run the demo from `demo/`.

## Guidelines

- Keep public options and story fields optional.
- Keep renderers limited to rendering `SoftBodyState`; behavior belongs in core or physics.
- Use `textContent` for all author-provided speech text.
- Add focused Vitest coverage for pure behavior and run the full suite before opening a change.
- Preserve reduced-motion behavior for every new interaction.
