import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// `npm run dev`   → serves the demo page (demo/index.html) with the library linked live.
// `npm run build` → builds the library (ESM + UMD) into dist/.
export default defineConfig({
  root: 'demo',
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'Blob',
      fileName: 'blob',
    },
  },
});
