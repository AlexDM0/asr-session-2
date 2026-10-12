/**
 * A skeleton stands in for content and the surrounding region announces the loading, so what matters
 * is that the block itself is hidden from assistive technology, that its shape reaches the stylesheet
 * and that its size arrives as the token references it was given, never as a literal.
 */
import { cleanup, render } from '@testing-library/react';
import {
  afterEach,
  describe,
  expect,
  it,
} from 'bun:test';

import { SkeletonBlock } from './SkeletonBlock';

function onlySkeletonIn(container: HTMLElement): HTMLElement {
  const skeleton = container.firstElementChild;
  if (!(skeleton instanceof HTMLElement)) {
    throw new Error('Expected the skeleton block to render an element.');
  }
  return skeleton;
}

afterEach(cleanup);

describe('SkeletonBlock', () => {
  it('is hidden from assistive technology', () => {
    const { container } = render(<SkeletonBlock height="var(--font-size-body)" width="50%" />);

    expect(onlySkeletonIn(container).getAttribute('aria-hidden')).toBe('true');
  });

  it('is a square block unless another shape is given', () => {
    const { container } = render(<SkeletonBlock height="var(--font-size-body)" width="50%" />);

    expect(onlySkeletonIn(container).dataset['shape']).toBe('block');
  });

  it('mirrors the round and pill shapes as data-shape', () => {
    for (const shape of ['round', 'pill'] as const) {
      const { container, unmount } = render(<SkeletonBlock height="var(--toggle-height)" shape={shape} width="var(--toggle-width)" />);

      expect(onlySkeletonIn(container).dataset['shape']).toBe(shape);
      unmount();
    }
  });

  it('passes width and height through as the token references it was given', () => {
    const { container } = render(<SkeletonBlock height="var(--avatar-size)" shape="round" width="var(--avatar-size)" />);
    const skeleton = onlySkeletonIn(container);

    expect(skeleton.style.getPropertyValue('--skeleton-width')).toBe('var(--avatar-size)');
    expect(skeleton.style.getPropertyValue('--skeleton-height')).toBe('var(--avatar-size)');
  });
});
