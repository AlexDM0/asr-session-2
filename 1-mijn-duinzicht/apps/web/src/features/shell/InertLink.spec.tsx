/**
 * An inert link must look and behave like a designed link without doing anything, so what matters is
 * that it is focusable, marked and described as unavailable, and that mouse, Enter and Space change no
 * address and make no request.
 */
import {
  act,
  cleanup,
  render,
  screen,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  afterEach,
  describe,
  expect,
  it,
  mock,
  spyOn,
} from 'bun:test';
import { createMemoryRouter, RouterProvider } from 'react-router';

import { InertLink } from './InertLink';

function renderInertLinkAt(startAddress: string): ReturnType<typeof createMemoryRouter> {
  const router = createMemoryRouter([{ path: '*', element: <InertLink>Example unavailable</InertLink> }], { initialEntries: [startAddress] });
  render(<RouterProvider router={router} />);
  return router;
}

afterEach(() => {
  cleanup();
  mock.restore();
});

describe('InertLink', () => {
  it('is a focusable link marked as disabled and described as unavailable in this demo', async () => {
    const user = userEvent.setup();
    renderInertLinkAt('/example');

    const link = screen.getByRole('link', { name: 'Example unavailable' });
    await user.tab();

    expect(document.activeElement).toBe(link);
    expect(link.getAttribute('aria-disabled')).toBe('true');
    expect(link.hasAttribute('href')).toBe(false);
    expect(screen.getByRole('link', { description: 'Niet beschikbaar in deze demo' })).toBe(link);
  });

  it('changes no address and makes no request on click, Enter or Space', async () => {
    const user = userEvent.setup();
    const fetchSpy = spyOn(globalThis, 'fetch');
    const router = renderInertLinkAt('/example');
    const link = screen.getByRole('link', { name: 'Example unavailable' });
    const startLocationKey = router.state.location.key;

    await user.click(link);
    await act(async () => {
      link.focus();
      await user.keyboard('{Enter}');
      await user.keyboard(' ');
    });

    expect(router.state.location.pathname).toBe('/example');
    expect(router.state.location.key).toBe(startLocationKey);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
