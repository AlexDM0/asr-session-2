/**
 * Below the breakpoint the menu button is the only way to the destinations of the header, so what
 * matters is that it is announced with its label, its expanded state and the panel it controls, that
 * activating it by mouse or keyboard asks for the toggle, and that its label follows the open state.
 */
import { cleanup, render, screen } from '@testing-library/react';
import userEvent                   from '@testing-library/user-event';
import {
  afterEach,
  describe,
  expect,
  it,
  mock,
} from 'bun:test';
import { createRef }    from 'react';
import { MemoryRouter } from 'react-router';

import { CompactHeaderBar } from './CompactHeaderBar';

const EXAMPLE_PANEL_ID = 'example-menu-panel';

function renderCompactHeaderBar(menuIsOpen: boolean, onMenuToggle: () => void = () => undefined): void {
  render(
    <MemoryRouter>
      <CompactHeaderBar menuButtonReference={createRef()} menuIsOpen={menuIsOpen} menuPanelId={EXAMPLE_PANEL_ID} onMenuToggle={onMenuToggle} />
    </MemoryRouter>,
  );
}

afterEach(cleanup);

describe('CompactHeaderBar', () => {
  it('shows the wordmark link and a closed menu button labelled "Menu openen" that controls the panel', () => {
    renderCompactHeaderBar(false);

    const menuButton = screen.getByRole('button', { name: 'Menu openen' });

    expect(screen.getByRole('link', { name: 'Duinzicht Verzekeringen, naar je overzicht' }).getAttribute('href')).toBe('/');
    expect(menuButton.getAttribute('aria-expanded')).toBe('false');
    expect(menuButton.getAttribute('aria-controls')).toBe(EXAMPLE_PANEL_ID);
    expect(menuButton.getAttribute('type')).toBe('button');
  });

  it('asks for the toggle when the menu button is clicked or activated with Enter or Space', async () => {
    const user = userEvent.setup();
    const toggleMenu = mock(() => undefined);
    renderCompactHeaderBar(false, toggleMenu);

    await user.click(screen.getByRole('button', { name: 'Menu openen' }));
    await user.keyboard('{Enter}');
    await user.keyboard(' ');

    expect(toggleMenu).toHaveBeenCalledTimes(3);
  });

  it('is labelled "Menu sluiten" and expanded while the menu is open', () => {
    renderCompactHeaderBar(true);

    const menuButton = screen.getByRole('button', { name: 'Menu sluiten' });

    expect(menuButton.getAttribute('aria-expanded')).toBe('true');
    expect(screen.queryByRole('button', { name: 'Menu openen' })).toBeNull();
  });

  it('hands the menu button to the given reference so focus can return to it', () => {
    const menuButtonReference = createRef<HTMLButtonElement>();
    render(
      <MemoryRouter>
        <CompactHeaderBar menuButtonReference={menuButtonReference} menuIsOpen={false} menuPanelId={EXAMPLE_PANEL_ID} onMenuToggle={() => undefined} />
      </MemoryRouter>,
    );

    expect(menuButtonReference.current).toBe(screen.getByRole('button', { name: 'Menu openen' }));
  });
});
