import express from 'express';
import { afterEach, describe, expect, it } from 'vitest';
import { createDropRouter } from './drop.mjs';
import { errorHandler } from '../middleware/error-handler.mjs';

const running = new Set();
afterEach(async () => {
  await Promise.all([...running].map((server) => new Promise((resolve) => server.close(resolve))));
  running.clear();
});

async function arranca(drop) {
  const app = express();
  app.use(
    '/api/drop',
    createDropRouter({ config: { publicOrigin: 'https://rocky035.com' }, drop })
  );
  app.use(errorHandler({ logger: { error() {}, warn() {}, info() {} } }));
  const server = await new Promise((resolve) => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  running.add(server);
  return `http://127.0.0.1:${server.address().port}`;
}

const DROP = {
  handle: 'rocky-drop-4',
  shortTitle: 'Drop 4',
  launchAt: '2026-10-10T20:00:00+02:00',
};

describe('/api/drop/calendario.ics', () => {
  it('se descarga como calendario de verdad', async () => {
    const base = await arranca(DROP);
    const response = await fetch(`${base}/api/drop/calendario.ics`);
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toMatch(/^text\/calendar/);
    expect(response.headers.get('content-disposition')).toContain('rocky035-rocky-drop-4.ics');
    expect(await response.text()).toContain('DTSTART:20261010T180000Z');
  });

  it('sin fecha, no hay evento', async () => {
    const base = await arranca({ ...DROP, launchAt: null });
    const response = await fetch(`${base}/api/drop/calendario.ics`);
    expect(response.status).toBe(404);
    expect((await response.json()).message).toMatch(/fecha/);
  });
});
