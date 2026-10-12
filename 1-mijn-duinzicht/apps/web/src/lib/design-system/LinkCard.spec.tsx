/**
 * LinkCard is the clickable row of lists and action panels, so what matters is that the whole card
 * is one router link whose name is its visible text in reading order (title, suffix, subtitle; the
 * suffix is where callers put hidden punctuation or an unread label), and that every visual variant
 * reaches the stylesheet through `data-*` with the documented defaults. happy-dom separates every
 * element's text with a space in the name, so the order is matched with flexible whitespace.
 */
import { cleanup, render, screen } from '@testing-library/react';
import {
  afterEach,
  describe,
  expect,
  it
} from 'bun:test';
import { MemoryRouter } from 'react-router';

import { LinkCard }       from './LinkCard';
import { VisuallyHidden } from './VisuallyHidden';

afterEach(cleanup);

describe('LinkCard', () => {
  it('renders one router link named by the title, the suffix text and the subtitle in order', () => {
    render(
      <MemoryRouter>
        <LinkCard
          leadingIcon={{ icon: 'description' }}
          subtitle="Example subtitle"
          title="Example title"
          titleSuffix={<VisuallyHidden>,</VisuallyHidden>}
          to="/example-card"
        />
      </MemoryRouter>,
    );

    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(screen.getByRole('link', { name: /^Example title\s*,\s*Example subtitle$/ }).getAttribute('href')).toBe('/example-card');
  });

  it('is named by its title alone when it has no subtitle or suffix', () => {
    render(
      <MemoryRouter>
        <LinkCard title="Example title only" to="/example-card" />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'Example title only' })).toBeDefined();
  });

  it('uses raised, strong and regular as defaults and mirrors each as a data attribute', () => {
    render(
      <MemoryRouter>
        <LinkCard title="Example defaults" to="/example-card" />
      </MemoryRouter>,
    );

    const card = screen.getByRole('link', { name: 'Example defaults' });

    expect(card.dataset['variant']).toBe('raised');
    expect(card.dataset['titleEmphasis']).toBe('strong');
    expect(card.dataset['titleSize']).toBe('regular');
  });

  it('mirrors the flat variant, regular emphasis and large title size', () => {
    render(
      <MemoryRouter>
        <LinkCard title="Example variants" titleEmphasis="regular" titleSize="large" to="/example-card" variant="flat" />
      </MemoryRouter>,
    );

    const card = screen.getByRole('link', { name: 'Example variants' });

    expect(card.dataset['variant']).toBe('flat');
    expect(card.dataset['titleEmphasis']).toBe('regular');
    expect(card.dataset['titleSize']).toBe('large');
  });

  it('keeps the leading circle and the chevron out of the name', () => {
    render(
      <MemoryRouter>
        <LinkCard leadingIcon={{ icon: 'mail', tone: 'cream' }} title="Example decorated" to="/example-card" />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'Example decorated' })).toBeDefined();
    expect(screen.getByText('mail').closest('[data-tone="cream"]')?.getAttribute('aria-hidden')).toBe('true');
    expect(screen.getByText('chevron_right').getAttribute('aria-hidden')).toBe('true');
  });
});
