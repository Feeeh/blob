import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// `npm run dev`        → serves the demo page (demo/index.html) with the library linked live.
// `npm run build`      → builds the library (ESM + UMD) into dist/.
// `npm run build:demo` → builds the demo as a static site into demo-dist/ (deployable anywhere).
export default defineConfig(({ mode }) => ({
  root: 'demo',
  base: './',
  build: mode === 'demo'
    ? {
        outDir: resolve(__dirname, 'demo-dist'),
        emptyOutDir: true,
      }
    : {
        outDir: resolve(__dirname, 'dist'),
        emptyOutDir: true,
        lib: {
          entry: resolve(__dirname, 'src/index.ts'),
          name: 'Blob',
          fileName: 'blob',
        },
      },
}));
