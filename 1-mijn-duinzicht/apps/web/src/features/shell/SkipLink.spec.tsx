/**
 * The skip link lets keyboard users pass the header, so what matters is that it is a real link to the main
 * content's id, that activating it by mouse or Enter moves focus to that element, and that it never changes
 * the address (a hash change would reach the router as a navigation).
 */
import { cleanup, render, screen } from '@testing-library/react';
import userEvent                   from '@testing-library/user-event';
import {
  afterEach,
  describe,
  expect,
  it,
} from 'bun:test';

import { SkipLink } from './SkipLink';

const EXAMPLE_TARGET_ID = 'example-main-content';

function renderSkipLinkBeforeTarget(): void {
  render(
    <>
      <SkipLink targetId={EXAMPLE_TARGET_ID} />
      <button type="button">Example header control</button>
      <main id={EXAMPLE_TARGET_ID} tabIndex={-1}>Example page</main>
    </>,
  );
}

afterEach(cleanup);

describe('SkipLink', () => {
  it('is a link "Naar de inhoud" pointing at the target id', () => {
    renderSkipLinkBeforeTarget();

    expect(screen.getByRole('link', { name: 'Naar de inhoud' }).getAttribute('href')).toBe(`#${EXAMPLE_TARGET_ID}`);
  });

  it('moves focus to the target when clicked, without changing the address', async () => {
    const user = userEvent.setup();
    renderSkipLinkBeforeTarget();
    const addressBefore = window.location.href;

    await user.click(screen.getByRole('link', { name: 'Naar de inhoud' }));

    expect(document.activeElement).toBe(screen.getByRole('main'));
    expect(window.location.href).toBe(addressBefore);
  });

  it('moves focus to the target when reached with Tab and activated with Enter', async () => {
    const user = userEvent.setup();
    renderSkipLinkBeforeTarget();
    const addressBefore = window.location.href;

    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('link', { name: 'Naar de inhoud' }));
    await user.keyboard('{Enter}');

    expect(document.activeElement).toBe(screen.getByRole('main'));
    expect(window.location.href).toBe(addressBefore);
  });
});
