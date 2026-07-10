import { afterEach, describe, expect, it, vi } from 'vitest';
import { BlobEmitter } from './emitter';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('BlobEmitter', () => {
  it('isolates a throwing handler so remaining listeners still run', () => {
    const emitter = new BlobEmitter();
    const workingHandler = vi.fn();
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    emitter.on('detach', () => {
      throw new Error('listener failure');
    });
    emitter.on('detach', workingHandler);

    emitter.emit('detach', undefined);

    expect(workingHandler).toHaveBeenCalledWith(undefined);
    expect(error).toHaveBeenCalledOnce();
  });
});
