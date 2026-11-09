import { describe, expect, it, vi } from 'vitest';
import { MemoryStore } from '../storage/memory-store.mjs';
import { silentLogger } from '../lib/logger.mjs';
import { createAvisosSender } from './avisos-envio.mjs';
import { createAvisosService } from './avisos.mjs';

const FROM = {
  name: 'El Recadero',
  email: 'avisos@rocky035.com',
  raw: 'El Recadero <avisos@rocky035.com>',
};
const CORREO = { subject: 'Ha caído', html: '<p>Hola</p>', text: 'Hola' };

async function escenario({ emails = [], batchSize = 100, mailer } = {}) {
  const store = new MemoryStore();
  const avisos = createAvisosService({ store, logger: silentLogger });
  for (const email of emails) await avisos.register({ product: '35-red', email });
  const enviados = [];
  const mailerImpl = mailer ?? {
    sendBatch: vi.fn(async (messages, options) => {
      enviados.push({ messages, options });
      return { ids: messages.map((_, i) => `id-${i}`) };
    }),
  };
  const sender = createAvisosSender({
    avisos,
    mailer: mailerImpl,
    from: FROM,
    batchSize,
    logger: silentLogger,
  });
  return { avisos, sender, enviados, mailer: mailerImpl };
}

describe('createAvisosSender', () => {
  it('exige remitente', () => {
    expect(() => createAvisosSender({ avisos: {}, mailer: {}, from: null })).toThrow(/AVISOS_FROM/);
  });

  it('en simulacro cuenta pendientes sin enviar ni tocar la lista', async () => {
    const { sender, enviados, avisos } = await escenario({ emails: ['a@b.cd', 'c@d.ef'] });
    const resumen = await sender.send({ product: '35-red', ...CORREO, dryRun: true });
    expect(resumen).toEqual({
      product: '35-red',
      total: 2,
      pending: 2,
      sent: 0,
      batches: 0,
      cleared: false,
      dryRun: true,
    });
    expect(enviados).toHaveLength(0);
    expect(await avisos.list('35-red')).toHaveLength(2);
  });

  it('envía por lotes, marca cada lote y borra la lista al terminar', async () => {
    const emails = ['a@b.cd', 'c@d.ef', 'e@f.gh'];
    const { sender, enviados, avisos } = await escenario({ emails, batchSize: 2 });

    const resumen = await sender.send({ product: '35-red', ...CORREO, dryRun: false });

    expect(resumen).toMatchObject({ total: 3, pending: 3, sent: 3, batches: 2, cleared: true });
    expect(enviados.map((l) => l.messages.length)).toEqual([2, 1]);
    const primero = enviados[0].messages[0];
    expect(primero).toMatchObject({
      from: FROM.raw,
      to: ['a@b.cd'],
      subject: 'Ha caído',
      html: '<p>Hola</p>',
      text: 'Hola',
    });
    expect(primero.headers['List-Unsubscribe']).toBe('<mailto:avisos@rocky035.com?subject=baja>');
    expect(enviados[0].options.idempotencyKey).toMatch(/^avisos-[0-9a-f]{40}$/);
    expect(enviados[0].options.idempotencyKey).not.toBe(enviados[1].options.idempotencyKey);
    expect(await avisos.list('35-red')).toEqual([]);
    expect(await avisos.products()).toEqual([]);
  });

  it('con keep conserva la lista marcada como enviada', async () => {
    const { sender, avisos } = await escenario({ emails: ['a@b.cd'] });
    const resumen = await sender.send({ product: '35-red', ...CORREO, dryRun: false, keep: true });
    expect(resumen.cleared).toBe(false);
    const lista = await avisos.list('35-red');
    expect(lista).toHaveLength(1);
    expect(typeof lista[0].enviado).toBe('string');
  });

  it('si un lote falla, lo ya enviado queda marcado y el resto se reanuda', async () => {
    const emails = ['a@b.cd', 'c@d.ef', 'e@f.gh', 'g@h.ij'];
    let llamadas = 0;
    const mailer = {
      sendBatch: vi.fn(async (messages) => {
        llamadas += 1;
        if (llamadas === 2) throw new Error('Resend caído');
        return { ids: messages.map(() => 'id') };
      }),
    };
    const { sender, avisos } = await escenario({ emails, batchSize: 2, mailer });

    await expect(sender.send({ product: '35-red', ...CORREO, dryRun: false })).rejects.toThrow(
      'Resend caído'
    );
    const tras = await avisos.list('35-red');
    expect(tras.filter((e) => e.enviado).map((e) => e.email)).toEqual(['a@b.cd', 'c@d.ef']);

    const resumen = await sender.send({ product: '35-red', ...CORREO, dryRun: false });
    expect(resumen).toMatchObject({ total: 4, pending: 2, sent: 2, batches: 1, cleared: true });
    expect(mailer.sendBatch.mock.calls[2][0].map((m) => m.to[0])).toEqual(['e@f.gh', 'g@h.ij']);
  });

  it('usa reply_to y su email como contacto de baja cuando existe', async () => {
    const store = new MemoryStore();
    const avisos = createAvisosService({ store, logger: silentLogger });
    await avisos.register({ product: '35-red', email: 'a@b.cd' });
    const sendBatch = vi.fn(async () => ({ ids: [] }));
    const sender = createAvisosSender({
      avisos,
      mailer: { sendBatch },
      from: FROM,
      replyTo: { name: '', email: 'hola@rocky035.com', raw: 'hola@rocky035.com' },
      logger: silentLogger,
    });
    await sender.send({ product: '35-red', ...CORREO, dryRun: false });
    const mensaje = sendBatch.mock.calls[0][0][0];
    expect(mensaje.reply_to).toBe('hola@rocky035.com');
    expect(mensaje.headers['List-Unsubscribe']).toBe('<mailto:hola@rocky035.com?subject=baja>');
  });
});

describe('envío por drop (avisos-de-drop)', () => {
  async function escenarioDrop() {
    const store = new MemoryStore();
    const avisos = createAvisosService({ store, logger: silentLogger });
    await avisos.register({ product: 'rocky-drop-6', email: 'a@x.es' });
    await avisos.register({ product: 'rocky-drop-6', email: 'b@x.es' });
    await avisos.register({ product: 'rocky-el-jefe', email: 'a@x.es' });
    await avisos.register({ product: 'rocky-el-jefe', email: 'c@x.es' });
    const enviados = [];
    const sender = createAvisosSender({
      avisos,
      mailer: {
        sendBatch: vi.fn(async (messages) => {
          enviados.push(...messages.map((m) => m.to[0]));
          return {};
        }),
      },
      from: FROM,
      batchSize: 2,
      logger: silentLogger,
    });
    return { avisos, sender, enviados };
  }

  it('junta las listas, manda un correo por persona y las borra', async () => {
    const { avisos, sender, enviados } = await escenarioDrop();
    const resumen = await sender.sendMany({
      keys: ['rocky-drop-6', 'rocky-el-jefe'],
      ...CORREO,
      dryRun: false,
    });
    expect(enviados.sort()).toEqual(['a@x.es', 'b@x.es', 'c@x.es']);
    expect(resumen).toMatchObject({ total: 3, pending: 3, sent: 3, batches: 2, cleared: true });
    expect(await avisos.list('rocky-drop-6')).toEqual([]);
    expect(await avisos.list('rocky-el-jefe')).toEqual([]);
  });

  it('en simulacro cuenta personas distintas sin enviar ni marcar', async () => {
    const { avisos, sender, enviados } = await escenarioDrop();
    const resumen = await sender.sendMany({ keys: ['rocky-drop-6', 'rocky-el-jefe'], ...CORREO });
    expect(resumen).toMatchObject({ total: 3, pending: 3, sent: 0, dryRun: true });
    expect(enviados).toEqual([]);
    expect((await avisos.list('rocky-drop-6')).every((e) => !e.enviado)).toBe(true);
  });

  it('con keep marca cada lista sin borrarla', async () => {
    const { avisos, sender } = await escenarioDrop();
    await sender.sendMany({
      keys: ['rocky-drop-6', 'rocky-el-jefe'],
      ...CORREO,
      dryRun: false,
      keep: true,
    });
    expect((await avisos.list('rocky-el-jefe')).every((e) => e.enviado)).toBe(true);
    expect(await avisos.list('rocky-drop-6')).toHaveLength(2);
  });
});
