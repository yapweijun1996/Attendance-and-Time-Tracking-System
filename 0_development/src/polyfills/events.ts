type Listener = (...args: unknown[]) => void;

interface ListenerEntry {
  listener: Listener;
  once: boolean;
}

class EventEmitter {
  private events = new Map<string | symbol, ListenerEntry[]>();
  private maxListeners = 10;

  static listenerCount(emitter: EventEmitter, event: string | symbol): number {
    return emitter.listenerCount(event);
  }

  addListener(event: string | symbol, listener: Listener): this {
    return this.on(event, listener);
  }

  on(event: string | symbol, listener: Listener): this {
    const listeners = this.events.get(event) ?? [];
    listeners.push({ listener, once: false });
    this.events.set(event, listeners);
    return this;
  }

  once(event: string | symbol, listener: Listener): this {
    const listeners = this.events.get(event) ?? [];
    listeners.push({ listener, once: true });
    this.events.set(event, listeners);
    return this;
  }

  prependListener(event: string | symbol, listener: Listener): this {
    const listeners = this.events.get(event) ?? [];
    listeners.unshift({ listener, once: false });
    this.events.set(event, listeners);
    return this;
  }

  prependOnceListener(event: string | symbol, listener: Listener): this {
    const listeners = this.events.get(event) ?? [];
    listeners.unshift({ listener, once: true });
    this.events.set(event, listeners);
    return this;
  }

  off(event: string | symbol, listener: Listener): this {
    return this.removeListener(event, listener);
  }

  removeListener(event: string | symbol, listener: Listener): this {
    const listeners = this.events.get(event);
    if (!listeners) {
      return this;
    }
    this.events.set(
      event,
      listeners.filter((entry) => entry.listener !== listener)
    );
    if ((this.events.get(event)?.length ?? 0) === 0) {
      this.events.delete(event);
    }
    return this;
  }

  removeAllListeners(event?: string | symbol): this {
    if (event === undefined) {
      this.events.clear();
      return this;
    }
    this.events.delete(event);
    return this;
  }

  setMaxListeners(n: number): this {
    this.maxListeners = n;
    return this;
  }

  getMaxListeners(): number {
    return this.maxListeners;
  }

  listeners(event: string | symbol): Listener[] {
    return (this.events.get(event) ?? []).map((entry) => entry.listener);
  }

  listenerCount(event: string | symbol): number {
    return this.events.get(event)?.length ?? 0;
  }

  emit(event: string | symbol, ...args: unknown[]): boolean {
    const listeners = this.events.get(event);
    if (!listeners || listeners.length === 0) {
      return false;
    }

    const snapshot = [...listeners];
    for (const entry of snapshot) {
      entry.listener(...args);
      if (entry.once) {
        this.removeListener(event, entry.listener);
      }
    }
    return true;
  }

  eventNames(): Array<string | symbol> {
    return [...this.events.keys()];
  }
}

// pouchdb-browser copies methods with Object.keys(EE.prototype), which only sees
// enumerable properties. Class methods are non-enumerable by default.
for (const key of Object.getOwnPropertyNames(EventEmitter.prototype)) {
  if (key === "constructor") {
    continue;
  }

  const descriptor = Object.getOwnPropertyDescriptor(EventEmitter.prototype, key);
  if (!descriptor || descriptor.enumerable) {
    continue;
  }

  Object.defineProperty(EventEmitter.prototype, key, {
    ...descriptor,
    enumerable: true,
  });
}

export { EventEmitter };
export default EventEmitter;
