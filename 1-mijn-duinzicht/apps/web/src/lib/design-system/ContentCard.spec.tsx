/**
 * Cards group content on a page, so what matters is that a titled card is a section named by its
 * title, an untitled card adds no landmark, and the padding, elevation and readable-width variants
 * reach the stylesheet.
 */
import { cleanup, render, screen } from '@testing-library/react';
import {
  afterEach,
  describe,
  expect,
  it,
} from 'bun:test';

import { ContentCard } from './ContentCard';

afterEach(cleanup);

describe('ContentCard', () => {
  it('is a section labelled by its title, at heading level 2 by default', () => {
    render(<ContentCard padding="space24" title="Example card">Example content</ContentCard>);

    const section = screen.getByRole('region', { name: 'Example card' });

    expect(section.tagName).toBe('SECTION');
    expect(screen.getByRole('heading', { level: 2, name: 'Example card' })).toBeDefined();
  });

  it('renders its title at heading level 3 when asked', () => {
    render(<ContentCard padding="space24" title="Example card" titleLevel={3}>Example content</ContentCard>);

    expect(screen.getByRole('heading', { level: 3, name: 'Example card' })).toBeDefined();
  });

  it('is a plain div without a title', () => {
    render(<ContentCard padding="space24">Example content</ContentCard>);

    expect(screen.getByText('Example content').tagName).toBe('DIV');
    expect(screen.queryByRole('region')).toBeNull();
  });

  it('defaults to flat elevation and a column-wide card', () => {
    render(<ContentCard padding="space24">Example content</ContentCard>);

    const card = screen.getByText('Example content');

    expect(card.dataset['elevation']).toBe('flat');
    expect(card.dataset['readableWidth']).toBe('false');
  });

  it('mirrors padding, elevation and readable width as data attributes', () => {
    render(<ContentCard elevation="raised" isReadableWidth padding="space40">Example content</ContentCard>);

    const card = screen.getByText('Example content');

    expect(card.dataset['padding']).toBe('space40');
    expect(card.dataset['elevation']).toBe('raised');
    expect(card.dataset['readableWidth']).toBe('true');
  });
});
