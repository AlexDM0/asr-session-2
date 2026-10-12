/**
 * TextLink navigates inside the portal, so what matters is that it is a router link to the given
 * path named by its text alone, and that the chevron sits on the requested side (or is absent)
 * without ever becoming part of the name.
 */
import { cleanup, render, screen } from '@testing-library/react';
import {
  afterEach,
  describe,
  expect,
  it
} from 'bun:test';
import { MemoryRouter } from 'react-router';

import { TextLink, type TextLinkChevron } from './TextLink';

function renderTextLink(chevron?: TextLinkChevron) {
  return render(
    <MemoryRouter>
      {chevron === undefined ? <TextLink to="/example-path">Example link</TextLink> : <TextLink chevron={chevron} to="/example-path">Example link</TextLink>}
    </MemoryRouter>,
  );
}

afterEach(cleanup);

describe('TextLink', () => {
  it('renders a router link to the given path named by its text alone', () => {
    renderTextLink();

    expect(screen.getByRole('link', { name: 'Example link' }).getAttribute('href')).toBe('/example-path');
  });

  it('shows a trailing chevron by default, hidden from assistive technology', () => {
    renderTextLink();

    const link = screen.getByRole('link', { name: 'Example link' });
    const chevron = screen.getByText('chevron_right');

    expect(link.dataset['chevron']).toBe('trailing');
    expect(chevron.getAttribute('aria-hidden')).toBe('true');
    expect(link.lastElementChild).toBe(chevron);
  });

  it('shows a leading chevron pointing left when asked to', () => {
    renderTextLink('leading');

    const link = screen.getByRole('link', { name: 'Example link' });

    expect(link.firstElementChild).toBe(screen.getByText('chevron_left'));
    expect(screen.queryByText('chevron_right')).toBeNull();
  });

  it('shows no chevron when asked for none', () => {
    renderTextLink('none');

    expect(screen.getByRole('link', { name: 'Example link' }).dataset['chevron']).toBe('none');
    expect(screen.queryByText('chevron_right')).toBeNull();
    expect(screen.queryByText('chevron_left')).toBeNull();
  });
});
