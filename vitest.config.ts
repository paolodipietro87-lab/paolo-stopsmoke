import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    // Default node; i test del DOM chiedono jsdom con il docblock @vitest-environment.
    environment: 'node',
  },
});
