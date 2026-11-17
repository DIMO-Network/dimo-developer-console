import { useSyncExternalStore } from 'react';

// One clock for every "5 min ago" on the page: a single interval, started by
// the first subscriber and stopped when the last one leaves, so a table of 100
// rows ticks once a minute instead of running 100 timers.
const MINUTE = 60_000;

const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;
let now = 0;

const tick = () => {
  now = Date.now();
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  if (timer === undefined) {
    // The clock was stopped: catch up now, then tick every minute.
    tick();
    timer = setInterval(tick, MINUTE);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer !== undefined) {
      clearInterval(timer);
      timer = undefined;
    }
  };
};

// While stopped (first render, the server, hydration), the time is floored to
// the minute: React reads a snapshot more than once per render and needs the
// same value each time, and server and browser agree within the same minute.
const snapshot = () =>
  timer === undefined ? Math.floor(Date.now() / MINUTE) * MINUTE : now;

/** Milliseconds since the epoch, re-rendering the caller once a minute. */
export const useMinuteClock = (): number =>
  useSyncExternalStore(subscribe, snapshot, snapshot);
