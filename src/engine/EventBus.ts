export type EventHandler<T> = (payload: T) => void;

/**
 * Lightweight, strongly-typed publish/subscribe event bus.
 * Decouples gameplay systems (crops, inventory, time) from UI and audio.
 */
export class EventBus<EventMap extends Record<string, unknown>> {
  private listeners = new Map<keyof EventMap, Set<EventHandler<never>>>();

  on<K extends keyof EventMap>(event: K, handler: EventHandler<EventMap[K]>): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(handler as EventHandler<never>);

    return () => {
      this.off(event, handler);
    };
  }

  off<K extends keyof EventMap>(event: K, handler: EventHandler<EventMap[K]>): void {
    const set = this.listeners.get(event);
    if (!set) return;
    set.delete(handler as EventHandler<never>);
  }

  emit<K extends keyof EventMap>(event: K, payload: EventMap[K]): void {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const handler of set) {
      (handler as EventHandler<EventMap[K]>)(payload);
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}
