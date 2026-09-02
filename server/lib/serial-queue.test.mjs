import { describe, expect, it } from 'vitest';
import { createSerialQueue } from './serial-queue.mjs';

describe('createSerialQueue', () => {
  it('runs actions one after another in submission order', async () => {
    const enqueue = createSerialQueue();
    const order = [];

    const results = await Promise.all([
      enqueue(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        order.push(1);
        return 1;
      }),
      enqueue(() => {
        order.push(2);
        return 2;
      }),
      enqueue(async () => {
        order.push(3);
        return 3;
      }),
    ]);

    expect(results).toEqual([1, 2, 3]);
    expect(order).toEqual([1, 2, 3]);
  });

  it('keeps the queue alive after a rejected action', async () => {
    const enqueue = createSerialQueue();

    await expect(
      enqueue(() => {
        throw new Error('falla');
      })
    ).rejects.toThrow('falla');
    await expect(enqueue(() => 'sigue')).resolves.toBe('sigue');
  });
});
