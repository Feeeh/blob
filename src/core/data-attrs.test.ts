import { describe, expect, it } from 'vitest';
import { compileDataAttributes } from './data-attrs';

function element(order: string, dataset: DOMStringMap, detach = false): HTMLElement {
  return { dataset: { blobOrder: order, ...dataset }, hasAttribute: () => detach } as unknown as HTMLElement;
}

describe('compileDataAttributes', () => {
  it('sorts valid entries and translates action fields', () => {
    const first = element('2', { blobAction: 'circle', blobSay: 'Projects', blobSleep: '250' }, true);
    const second = element('1', { blobSay: 'Menu' });
    const root = { querySelectorAll: () => [first, second] } as unknown as ParentNode;

    expect(compileDataAttributes(root)).toEqual([
      { attachTo: second, say: 'Menu' },
      { circle: first, detach: true, say: 'Projects', sleep: 250 },
    ]);
  });
});
