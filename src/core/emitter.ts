import type { BlobEventMap } from '../types';

type UntypedHandler = (payload: unknown) => void;

/** Small typed emitter shared by the imperative controller and future story engine. */
export class BlobEmitter {
  private readonly handlers = new Map<keyof BlobEventMap, Set<UntypedHandler>>();

  on<K extends keyof BlobEventMap>(event: K, handler: (payload: BlobEventMap[K]) => void): void {
    const listeners = this.handlers.get(event) ?? new Set<UntypedHandler>();
    listeners.add(handler as UntypedHandler);
    this.handlers.set(event, listeners);
  }

  off<K extends keyof BlobEventMap>(event: K, handler: (payload: BlobEventMap[K]) => void): void {
    this.handlers.get(event)?.delete(handler as UntypedHandler);
  }

  emit<K extends keyof BlobEventMap>(event: K, payload: BlobEventMap[K]): void {
    for (const handler of this.handlers.get(event) ?? []) {
      try {
        handler(payload);
      } catch (error) {
        console.error(`Blob ${String(event)} event handler failed.`, error);
      }
    }
  }

  clear(): void {
    this.handlers.clear();
  }
}
