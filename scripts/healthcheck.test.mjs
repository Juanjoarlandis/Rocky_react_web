import { execFile } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

const script = path.join(path.dirname(fileURLToPath(import.meta.url)), 'healthcheck.sh');
const servers = new Set();

afterEach(async () => {
  await Promise.all([...servers].map((server) => new Promise((done) => server.close(done))));
  servers.clear();
});

// Un servidor de mentira que responde a /api/health con el estado que se le diga.
async function fakeServer(status, { path: expectedPath = '/api/health' } = {}) {
  const requests = [];
  const server = http.createServer((req, res) => {
    requests.push(`${req.method} ${req.url}`);
    res.statusCode = req.url === expectedPath ? status : 404;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: status === 200 }));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  servers.add(server);
  return { port: server.address().port, requests };
}

function run(port, extraEnv = {}) {
  return new Promise((resolve) => {
    execFile(
      'bash',
      [script],
      { env: { PATH: process.env.PATH, PORT: String(port), ...extraEnv }, timeout: 8000 },
      (error, stdout, stderr) => resolve({ code: error ? (error.code ?? 1) : 0, stdout, stderr })
    );
  });
}

describe('sonda de salud del contenedor', () => {
  it('termina con 0 cuando /api/health responde 200', async () => {
    const { port, requests } = await fakeServer(200);

    expect((await run(port)).code).toBe(0);
    expect(requests).toEqual(['GET /api/health']);
  });

  it('termina con error cuando el almacén no está disponible (503)', async () => {
    const { port } = await fakeServer(503);

    expect((await run(port)).code).not.toBe(0);
  });

  it('termina con error con cualquier otro estado', async () => {
    const { port } = await fakeServer(200, { path: '/otra' });

    expect((await run(port)).code).not.toBe(0);
  });

  it('termina con error cuando nadie escucha en el puerto', async () => {
    const { port } = await fakeServer(200);
    await new Promise((done) => [...servers][0].close(done));
    servers.clear();

    expect((await run(port)).code).not.toBe(0);
  });

  it('no acepta un puerto que no sea un número', async () => {
    const { port } = await fakeServer(200);

    expect((await run(`${port}; exit 0`)).code).not.toBe(0);
    expect((await run('30x1')).code).not.toBe(0);
  });

  it('no da por bueno un estado que solo empieza por 200', async () => {
    const net = await import('node:net');
    const server = net.createServer((socket) => {
      socket.on('error', () => {});
      socket.resume();
      socket.end('HTTP/1.1 2000 Raro\r\n\r\n');
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    servers.add(server);

    expect((await run(server.address().port)).code).not.toBe(0);
  });
});
