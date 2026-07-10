import type { StoryStep } from '../types';

/** Compile ordered data-blob-* attributes into story steps. */
export function compileDataAttributes(root: ParentNode = document): StoryStep[] {
  return Array.from(root.querySelectorAll<HTMLElement>('[data-blob-order]'))
    .map((element) => ({ element, order: Number(element.dataset.blobOrder) }))
    .filter((entry) => Number.isFinite(entry.order))
    .sort((first, second) => first.order - second.order)
    .map(({ element }) => {
      const step: StoryStep = {};
      const sleep = Number(element.dataset.blobSleep);
      if (Number.isFinite(sleep) && sleep >= 0) step.sleep = sleep;
      if (element.dataset.blobSay !== undefined) step.say = element.dataset.blobSay;
      if (element.dataset.blobAction === 'circle') step.circle = element;
      else step.attachTo = element;
      if (element.hasAttribute('data-blob-detach')) step.detach = true;
      return step;
    });
}
