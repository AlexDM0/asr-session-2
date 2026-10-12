/**
 * TwoColumnGrid collapses to one column in compact layout mode through the stylesheet, so what the
 * spec can hold is that children keep their source order (the compact reading order), that the
 * caller's template reaches the element as `--two-column-template`, and that gap and alignment
 * reach the stylesheet through `data-*` with stretch as the default.
 */
import { cleanup, render, screen } from '@testing-library/react';
import {
  afterEach,
  describe,
  expect,
  it
} from 'bun:test';

import { TwoColumnGrid } from './TwoColumnGrid';

afterEach(cleanup);

describe('TwoColumnGrid', () => {
  it('renders its children in source order', () => {
    const { container } = render(
      <TwoColumnGrid gap="space24" template="minmax(0,1.4fr) minmax(0,1fr)">
        <p>Example first column</p>
        <p>Example second column</p>
      </TwoColumnGrid>,
    );

    const childTexts = [...(container.firstElementChild?.children ?? [])].map((child) => child.textContent);

    expect(childTexts).toEqual(['Example first column', 'Example second column']);
  });

  it('passes the template to the element as the --two-column-template custom property', () => {
    const { container } = render(
      <TwoColumnGrid gap="space16" template="minmax(0,1.4fr) minmax(0,1fr)">
        <p>Example content</p>
      </TwoColumnGrid>,
    );

    const grid = container.firstElementChild as HTMLElement;

    expect(grid.style.getPropertyValue('--two-column-template')).toBe('minmax(0,1.4fr) minmax(0,1fr)');
  });

  it('mirrors gap and alignment as data attributes, stretching by default', () => {
    const { container, rerender } = render(
      <TwoColumnGrid gap="space40" template="1fr 1fr">
        <p>Example content</p>
      </TwoColumnGrid>,
    );
    const grid = container.firstElementChild as HTMLElement;

    expect(grid.dataset['gap']).toBe('space40');
    expect(grid.dataset['alignItems']).toBe('stretch');
    rerender(
      <TwoColumnGrid alignItems="start" gap="space16" template="1fr 1fr">
        <p>Example content</p>
      </TwoColumnGrid>,
    );
    expect(screen.getByText('Example content').parentElement?.dataset['alignItems']).toBe('start');
    expect(grid.dataset['gap']).toBe('space16');
  });
});
