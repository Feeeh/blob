/** The demo's story config. Phase 2 mounts the real idle Blob. */

import { createBlob, type BlobController, type RendererKind } from '../src/index';
import character from './character';

const DEMO_STORAGE_KEY = 'blob-demo';

export function startDemo(renderer: RendererKind = 'canvas2d'): BlobController {
  resetDemoState();
  return createBlob({ ...character, renderer, storageKey: DEMO_STORAGE_KEY });
}

function resetDemoState(): void {
  try {
    localStorage.removeItem(`${DEMO_STORAGE_KEY}:dismissed`);
    localStorage.removeItem(`${DEMO_STORAGE_KEY}:story-played`);
  } catch {}
}

let blob = startDemo();
const rendererSelect = document.querySelector<HTMLSelectElement>('#renderer-select');
rendererSelect?.addEventListener('change', () => {
  blob.destroy();
  blob = startDemo(rendererSelect.value as RendererKind);
});
