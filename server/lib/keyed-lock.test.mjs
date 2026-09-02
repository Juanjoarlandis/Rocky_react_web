import { describe, expect, it } from 'vitest';
import { createKeyedLock } from './keyed-lock.mjs';

function deferred() {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe('createKeyedLock', () => {
  it('serializes actions that share a key and keeps different keys independent', async () => {
    const withLock = createKeyedLock();
    const events = [];
    const firstGate = deferred();

    const first = withLock('a', async () => {
      events.push('a1:start');
      await firstGate.promise;
      events.push('a1:end');
      return 'a1';
    });
    const second = withLock('a', async () => {
      events.push('a2:start');
      return 'a2';
    });
    const other = withLock('b', async () => {
      events.push('b1');
      return 'b1';
    });

    await other;
    expect(events).toEqual(['a1:start', 'b1']);

    firstGate.resolve();
    await expect(Promise.all([first, second])).resolves.toEqual(['a1', 'a2']);
    expect(events).toEqual(['a1:start', 'b1', 'a1:end', 'a2:start']);
  });

  it('releases the key after a failure so the next action still runs', async () => {
    const withLock = createKeyedLock();

    await expect(
      withLock('k', async () => {
        throw new Error('boom');
      })
    ).rejects.toThrow('boom');
    await expect(withLock('k', async () => 'after')).resolves.toBe('after');
  });
});
