import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import { versioneBuild } from './build-version.ts';

export default defineConfig({
  plugins: [react()],
  define: { __APP_VERSION__: JSON.stringify(versioneBuild()) },
  test: {
    // Default node; i test del DOM chiedono jsdom con il docblock @vitest-environment.
    environment: 'node',
  },
});
