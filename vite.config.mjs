import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://127.0.0.1:3001',
    },
  },
  test: {
    // Dos proyectos: el servidor y shared/ corren en Node puro; la interfaz
    // en jsdom con jest-dom y los stubs de setupTests.js.
    projects: [
      {
        extends: true,
        test: {
          name: 'server',
          environment: 'node',
          include: ['server/**/*.test.mjs', 'shared/**/*.test.mjs', 'scripts/**/*.test.mjs'],
        },
      },
      {
        extends: true,
        test: {
          name: 'client',
          environment: 'jsdom',
          globals: true,
          css: true,
          setupFiles: './src/setupTests.js',
          include: ['src/**/*.test.{js,jsx}'],
        },
      },
    ],
    // `npm run test:coverage`: cobertura del BFF y de shared/, con umbral.
    coverage: {
      provider: 'v8',
      include: ['server/**/*.mjs', 'shared/**/*.mjs'],
      exclude: ['**/*.test.mjs', 'server/index.mjs'],
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: 'coverage',
      thresholds: {
        lines: 80,
        functions: 80,
        statements: 80,
      },
    },
  },
});
