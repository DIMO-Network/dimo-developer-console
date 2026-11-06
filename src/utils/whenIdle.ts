// Runs `task` once the browser is idle, and by `timeout` at the latest. Safari
// has no requestIdleCallback: there it runs after `fallback`. Returns a cancel.
export const whenIdle = (
  task: () => void,
  { timeout, fallback }: { timeout: number; fallback: number },
): (() => void) => {
  if (typeof window.requestIdleCallback === 'function') {
    const id = window.requestIdleCallback(task, { timeout });
    return () => window.cancelIdleCallback(id);
  }
  const timer = setTimeout(task, fallback);
  return () => clearTimeout(timer);
};
