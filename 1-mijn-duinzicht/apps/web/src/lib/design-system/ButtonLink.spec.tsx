/**
 * A button link navigates, so what matters is that it is a link named by its text, a router link or a
 * download anchor depending on its destination, that its variant and size reach the stylesheet and that
 * its leading icon is decorative.
 */
import { cleanup, render, screen } from '@testing-library/react';
import {
  afterEach,
  describe,
  expect,
  it,
} from 'bun:test';
import { MemoryRouter } from 'react-router';

import { ButtonLink } from './ButtonLink';

afterEach(cleanup);

describe('ButtonLink', () => {
  it('is a router link named by its text', () => {
    render(
      <MemoryRouter>
        <ButtonLink to="/example" variant="secondary">Example destination</ButtonLink>
      </MemoryRouter>,
    );

    const link = screen.getByRole('link', { name: 'Example destination' });

    expect(link.getAttribute('href')).toBe('/example');
    expect(link.hasAttribute('download')).toBe(false);
  });

  it('is a download anchor with the given file name when given an address to download', () => {
    render(<ButtonLink downloadFileName="example.pdf" href="/api/example.pdf" variant="outline">Example download</ButtonLink>);

    const link = screen.getByRole('link', { name: 'Example download' });

    expect(link.getAttribute('href')).toBe('/api/example.pdf');
    expect(link.getAttribute('download')).toBe('example.pdf');
  });

  it('mirrors variant and size as data attributes, regular size by default', () => {
    render(
      <MemoryRouter>
        <ButtonLink to="/first" variant="primary">First example</ButtonLink>
        <ButtonLink size="small" to="/second" variant="outline">Second example</ButtonLink>
      </MemoryRouter>,
    );

    const firstLink = screen.getByRole('link', { name: 'First example' });
    const secondLink = screen.getByRole('link', { name: 'Second example' });

    expect(firstLink.dataset['variant']).toBe('primary');
    expect(firstLink.dataset['size']).toBe('regular');
    expect(secondLink.dataset['variant']).toBe('outline');
    expect(secondLink.dataset['size']).toBe('small');
  });

  it('keeps a leading icon out of the accessible name', () => {
    render(
      <MemoryRouter>
        <ButtonLink leadingIcon="download" to="/example" variant="outline">Example destination</ButtonLink>
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'Example destination' })).toBeDefined();
    expect(screen.getByText('download').getAttribute('aria-hidden')).toBe('true');
  });
});
