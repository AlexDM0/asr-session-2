/**
 * IconTile is a navigation shortcut, so what matters is that the whole tile is one router link named
 * by its title alone (circle and chevron are decoration) and that the chevron can be left out.
 */
import { cleanup, render, screen } from '@testing-library/react';
import {
  afterEach,
  describe,
  expect,
  it
} from 'bun:test';
import { MemoryRouter } from 'react-router';

import { IconTile } from './IconTile';

afterEach(cleanup);

describe('IconTile', () => {
  it('renders one router link to the destination named by its title', () => {
    render(
      <MemoryRouter>
        <IconTile icon="home" title="Example tile" to="/example-destination" />
      </MemoryRouter>,
    );

    const links = screen.getAllByRole('link');

    expect(links).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'Example tile' }).getAttribute('href')).toBe('/example-destination');
  });

  it('shows a trailing chevron by default, hidden from assistive technology', () => {
    render(
      <MemoryRouter>
        <IconTile icon="home" title="Example tile" to="/example-destination" />
      </MemoryRouter>,
    );

    expect(screen.getByText('chevron_right').getAttribute('aria-hidden')).toBe('true');
    expect(screen.getByText('home').closest('[aria-hidden="true"]')).not.toBeNull();
  });

  it('leaves the chevron out when hasChevron is false', () => {
    render(
      <MemoryRouter>
        <IconTile hasChevron={false} icon="home" title="Example tile" to="/example-destination" />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'Example tile' })).toBeDefined();
    expect(screen.queryByText('chevron_right')).toBeNull();
  });
});
