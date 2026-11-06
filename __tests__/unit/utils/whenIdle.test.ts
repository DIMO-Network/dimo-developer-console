import { whenIdle } from '@/utils/whenIdle';

describe('whenIdle', () => {
  const { requestIdleCallback, cancelIdleCallback } = window;
  afterEach(() => {
    window.requestIdleCallback = requestIdleCallback;
    window.cancelIdleCallback = cancelIdleCallback;
    jest.useRealTimers();
  });

  it('waits for the browser to be idle, within the timeout', () => {
    const idle = jest.fn(() => 7);
    window.requestIdleCallback = idle as unknown as typeof window.requestIdleCallback;
    window.cancelIdleCallback = jest.fn();
    const task = jest.fn();
    const cancel = whenIdle(task, { timeout: 2_000, fallback: 1_000 });
    expect(idle).toHaveBeenCalledWith(task, { timeout: 2_000 });
    cancel();
    expect(window.cancelIdleCallback).toHaveBeenCalledWith(7);
  });

  it('falls back to a timer where the browser has no idle callback, and cancels it', () => {
    jest.useFakeTimers();
    window.requestIdleCallback =
      undefined as unknown as typeof window.requestIdleCallback;
    const task = jest.fn();
    whenIdle(task, { timeout: 2_000, fallback: 1_000 });
    jest.advanceTimersByTime(1_000);
    expect(task).toHaveBeenCalledTimes(1);

    const cancelled = jest.fn();
    whenIdle(cancelled, { timeout: 2_000, fallback: 1_000 })();
    jest.advanceTimersByTime(1_000);
    expect(cancelled).not.toHaveBeenCalled();
  });
});
