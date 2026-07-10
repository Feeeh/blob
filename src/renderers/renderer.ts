/**
 * Renderer registry. Renderers are dumb: they receive the soft-body snapshot
 * each frame and draw it — no physics, no behavior (blob.md §2).
 * A custom renderer is just an object implementing the Renderer interface.
 */

import type { Renderer, RendererKind } from '../types';
import { Canvas2DRenderer } from './canvas2d';
import { CssRenderer } from './css';
import { SvgRenderer } from './svg';

export function createRenderer(
  kind: RendererKind | Renderer,
  reducedMotion = false,
): Renderer {
  if (typeof kind !== 'string') return kind;
  switch (kind) {
    case 'canvas2d':
      return new Canvas2DRenderer(reducedMotion);
    case 'svg':
      return new SvgRenderer();
    case 'css':
      return new CssRenderer();
  }
}
