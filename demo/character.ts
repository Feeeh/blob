import { defineBlobCharacter } from '../src/index';

// This file is the whole character. Copy it into any app, change values, or
// replace the renderer with your own object when the built-ins are not enough.
export default defineBlobCharacter({
  body: { color: '#8b5cf6', size: 32, points: 48 },
  physics: {
    stiffness: 170,
    bobAmplitude: 6,
    breatheAmplitude: 0.1,
  },
  bubble: {
    background: '#ffffff',
    color: '#1f1235',
    borderColor: '#1f1235',
    borderWidth: 4,
    shape: 'square',
    fontFamily: "'Blob Pixel', monospace",
    characterDelay: 15,
    autoAdvance: 800,
    tail: true,
  },
  attachment: { gap: 0, side: 'nearest' },
  morph: {
    shape: 'rounded',
    padding: 2,
    radius: 12,
    strokeColor: '#8b5cf6',
    strokeWidth: 6,
  },
  autoStart: true,
  story: [
    { sleep: 600 },
    { say: "Hi! I'm Blob - welcome to this portfolio." },
    { circle: '#main-menu', say: 'This whole menu is how visitors move around the site.' },
    { circle: '#menu-home', say: 'Home brings visitors back to this introduction.' },
    { circle: '#menu-projects', say: 'Projects jumps straight to the work.' },
    { circle: '#menu-about', say: 'About explains the person and process behind the work.' },
    { circle: '#menu-contact', say: 'Contact is where a visitor can get in touch.' },
    { circle: '#home', say: 'This opening section gives people a quick reason to keep exploring.' },
    { circle: '#projects', say: 'Projects is where the portfolio makes its case with real examples.' },
    { circle: '#about', say: 'About adds the context, values, and story behind those examples.' },
    { circle: '#contact', say: 'Contact gives the next step a clear place to happen.' },
    { detach: true },
  ],
  script(blob) {
    blob.on('step', (step) => {
      if (typeof step.circle === 'string' && !step.circle.startsWith('#menu-') && step.circle !== '#main-menu') {
        document.querySelector(step.circle)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
    blob.on('end', () => void blob.say("That's the tour. Poke me anytime!"));
  },
});
