/** Interactive documentation page: every "Try it" button drives one live Blob. */

import {
  createBlob,
  type BlobController,
  type BlobOptions,
  type RendererKind,
} from '../src/index';

const STORAGE_KEY = 'blob-docs';

let overrides: BlobOptions = {};
let renderer: RendererKind = 'canvas2d';
let blob = mount();

function mount(): BlobController {
  try {
    localStorage.removeItem(`${STORAGE_KEY}:dismissed`);
  } catch {}
  return createBlob({ renderer, storageKey: STORAGE_KEY, ...overrides });
}

/** Docs examples swap whole configs, so each one rebuilds Blob from scratch. */
function remount(next: BlobOptions, line?: string): void {
  overrides = next;
  blob.destroy();
  blob = mount();
  if (line !== undefined) {
    void blob.say(line);
  }
}

const actions: Record<string, () => void> = {
  'hello': () => void blob.say('Hello! Click me or this bubble to advance.'),
  'poke-hint': () =>
    void blob.say('Clicking me pokes my body, advances speech, or starts my story. Try dragging me too!'),

  'body-sky': () =>
    remount({ body: { color: '#0ea5e9', size: 24 } }, 'A smaller sky-blue body.'),
  'body-big': () =>
    remount({ body: { color: '#ec4899', size: 64, points: 64 } }, 'A big pink body with extra points.'),
  'reset': () => remount({}, 'Back to my default self.'),

  'physics-bouncy': () =>
    remount(
      { physics: { stiffness: 320, damping: 10, bobAmplitude: 10, breatheAmplitude: 0.12, pokeStrength: 320 } },
      'Extra bouncy! Poke or drag me to feel it.',
    ),
  'physics-calm': () =>
    remount(
      { physics: { stiffness: 120, bobAmplitude: 2, breatheAmplitude: 0.02, pokeStrength: 80 } },
      'Calm and composed. Barely a wobble.',
    ),

  'bubble-default': () => remount({}, 'The classic pixel bubble.'),
  'bubble-soft': () =>
    remount(
      {
        bubble: {
          background: '#064e3b',
          color: '#d1fae5',
          borderColor: '#10b981',
          borderWidth: 2,
          shape: 'rounded',
          borderRadius: 16,
          fontFamily: 'system-ui, sans-serif',
          fontSize: 14,
          padding: 14,
          shadow: '0 8px 24px rgba(16, 185, 129, 0.35)',
        },
      },
      'A soft rounded bubble with a system font.',
    ),
  'bubble-neon': () =>
    remount(
      { bubble: { className: 'docs-neon-bubble', tail: false } },
      'This whole look comes from one CSS class.',
    ),

  'morph-rounded': () => blob.circle('#morph-target', { shape: 'rounded', radius: 16 }),
  'morph-circle': () => blob.circle('#morph-target', { shape: 'circle' }),
  'morph-rectangle': () => blob.circle('#morph-target', { shape: 'rectangle' }),
  'morph-pink': () =>
    blob.circle('#morph-target', { shape: 'rounded', radius: 20, strokeColor: '#ec4899', strokeWidth: 10, padding: 10 }),
  'detach': () => blob.detach(),

  'attach-top': () => blob.attachTo('#attach-target', { side: 'top', gap: 8 }),
  'attach-right': () => blob.attachTo('#attach-target', { side: 'right', gap: 8 }),
  'attach-bottom': () => blob.attachTo('#attach-target', { side: 'bottom', gap: 8 }),
  'attach-left': () => blob.attachTo('#attach-target', { side: 'left', gap: 8 }),

  'story': () => {
    remount({
      story: [
        { sleep: 300, say: 'A story is just a list of steps like this one.' },
        { attachTo: '#attach-target', attach: { side: 'top' }, say: 'Each step can travel somewhere...' },
        { circle: '#morph-target', morph: { shape: 'rounded' }, say: '...morph around something...' },
        { detach: true, say: 'and then let go. The end!' },
      ],
    });
    blob.start();
  },
  'skip': () => blob.skip(),
};

document.addEventListener('click', (event) => {
  const button = (event.target as HTMLElement).closest<HTMLElement>('[data-try]');
  const action = button?.dataset.try;
  if (action !== undefined) {
    actions[action]?.();
  }
});

const rendererSelect = document.querySelector<HTMLSelectElement>('#renderer-select');
rendererSelect?.addEventListener('change', () => {
  renderer = rendererSelect.value as RendererKind;
  remount(overrides, `Now drawn with the ${renderer} renderer.`);
});
