type Handler = (event: MessageEvent) => void;

const open = new Set<FakeChannel>();

class FakeChannel {
  private handlers = new Set<Handler>();
  constructor(readonly name: string) {
    open.add(this);
  }
  postMessage(data: unknown) {
    for (const other of open) {
      if (other !== this && other.name === this.name) {
        // A resolved promise is a real microtask, so fake timers don't hold it.
        Promise.resolve().then(() => other.deliver(data));
      }
    }
  }
  deliver(data: unknown) {
    if (!open.has(this)) return;
    for (const handler of this.handlers) handler({ data } as MessageEvent);
  }
  addEventListener(type: string, handler: Handler) {
    if (type === 'message') this.handlers.add(handler);
  }
  removeEventListener(type: string, handler: Handler) {
    if (type === 'message') this.handlers.delete(handler);
  }
  close() {
    open.delete(this);
    this.handlers.clear();
  }
}

export const installFakeBroadcastChannel = () => {
  const original = (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel;
  (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel = FakeChannel;
  return {
    // Stands in for another browser tab listening on the session channel.
    otherTab(name = 'dimo-console-session') {
      const channel = new FakeChannel(name);
      const received: unknown[] = [];
      channel.addEventListener('message', (e) => received.push(e.data));
      return {
        post: (data: unknown) => channel.postMessage(data),
        received,
        close: () => channel.close(),
      };
    },
    restore() {
      for (const channel of [...open]) channel.close();
      (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel = original;
    },
  };
};
