import type { BlobEventMap } from '../types';
/** Small typed emitter shared by the imperative controller and future story engine. */
export declare class BlobEmitter {
    private readonly handlers;
    on<K extends keyof BlobEventMap>(event: K, handler: (payload: BlobEventMap[K]) => void): void;
    off<K extends keyof BlobEventMap>(event: K, handler: (payload: BlobEventMap[K]) => void): void;
    emit<K extends keyof BlobEventMap>(event: K, payload: BlobEventMap[K]): void;
    clear(): void;
}
