import { describe, expect, it } from 'vitest';
import { createRenderer } from './renderer';

describe('renderer conformance', () => {
  for (const kind of ['canvas2d', 'svg', 'css'] as const) {
    it(`${kind} implements the renderer contract`, () => {
      const renderer = createRenderer(kind);
      expect(renderer.mount).toBeTypeOf('function');
      expect(renderer.render).toBeTypeOf('function');
      expect(renderer.destroy).toBeTypeOf('function');
    });
  }
});
