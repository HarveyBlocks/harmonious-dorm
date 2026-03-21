import path from 'node:path';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/backend/**/*.test.ts'],
    setupFiles: ['tests/backend/setup.ts'],
    sequence: {
      concurrent: false,
    },
  },
  server: {
    watch: {
      ignored: [
        'docs/**', // ignore all files in docs
        '**/*.md', // ignore all markdown files
        'prisma/**',
        '**/*.db',
        '**/*.prisma',
        '**/*.log',
        'logs/**',
      ]
    }
  },
});