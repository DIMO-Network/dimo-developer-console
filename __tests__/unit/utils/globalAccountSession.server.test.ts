/**
 * @jest-environment node
 */
import { onSessionChange, readSession } from '@/utils/globalAccountSession';

jest.mock('@turnkey/crypto', () => ({ decryptCredentialBundle: jest.fn() }));

describe('globalAccountSession on the server', () => {
  const original = (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel;
  afterEach(() => {
    (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel = original;
  });

  it('subscribing opens no channel and unsubscribing does nothing', () => {
    const channel = jest.fn();
    (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel = channel;
    const off = onSessionChange(jest.fn());
    expect(() => off()).not.toThrow();
    expect(channel).not.toHaveBeenCalled();
  });

  it('has no session', () => {
    expect(readSession()).toBeNull();
  });
});
