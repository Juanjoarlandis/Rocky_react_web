import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // El cliente no usa ninguna variable de entorno, así que Vite no lee `.env`:
  // ese fichero es del servidor (lleva sus secretos) y un `NODE_ENV=development`
  // local convertía `npm run build` en un build con React de desarrollo.
  envDir: false,
  build: {
    // Las ilustraciones optimizadas van siempre como fichero: Vite incrusta en
    // el JavaScript lo que pesa menos de 4 kB, y los pósters pequeños de la
    // cinta del pie metían 10 kB de base64 en el bundle inicial.
    assetsInlineLimit: (file) => (file.includes('/images/optimized/') ? false : undefined),
  },
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
