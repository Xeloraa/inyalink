import { afterEach, describe, expect, it, vi } from 'vitest';

const sqlMock = vi.hoisted(() => {
  const fn = vi.fn();
  return Object.assign(fn, { end: vi.fn() });
});

vi.mock('../src/db/client.js', () => ({
  getSql: () => sqlMock,
}));

vi.mock('../src/lib/config.js', () => ({
  config: {
    databaseUrl: 'postgres://test',
    port: 3001,
  },
}));

import {
  runRetentionCleanup,
  startRetentionScheduler,
} from '../src/lib/retention.js';

describe('retention cleanup', () => {
  afterEach(() => {
    sqlMock.mockReset();
    vi.useRealTimers();
  });

  it('hard-deletes expired messages and ai_conversations', async () => {
    sqlMock
      .mockResolvedValueOnce([{ id: 'm1' }, { id: 'm2' }])
      .mockResolvedValueOnce([{ id: 'c1' }]);

    const result = await runRetentionCleanup();

    expect(result).toEqual({
      messagesDeleted: 2,
      conversationsDeleted: 1,
    });
    expect(sqlMock).toHaveBeenCalledTimes(2);
  });

  it('starts an interval scheduler when DATABASE_URL is set', async () => {
    vi.useFakeTimers();
    sqlMock.mockResolvedValue([]);

    const handle = startRetentionScheduler(60_000);
    expect(handle).not.toBeNull();

    await vi.advanceTimersByTimeAsync(0);
    expect(sqlMock).toHaveBeenCalled();

    const callsAfterBoot = sqlMock.mock.calls.length;
    await vi.advanceTimersByTimeAsync(60_000);
    expect(sqlMock.mock.calls.length).toBeGreaterThan(callsAfterBoot);

    if (handle) clearInterval(handle);
  });
});
