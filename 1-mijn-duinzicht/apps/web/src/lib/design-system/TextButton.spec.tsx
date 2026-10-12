/**
 * TextButton changes state where a text link would navigate ("Wijzigen", "Annuleren"), so what
 * matters is that it is a native non-submitting button activated by click and keyboard, that it
 * reports an expanded state only when given one, that disabling blocks it, and that a caller can
 * return focus to it through its ref.
 */
import { cleanup, render, screen } from '@testing-library/react';
import userEvent                   from '@testing-library/user-event';
import {
  afterEach,
  describe,
  expect,
  it
} from 'bun:test';
import { createRef } from 'react';

import { TextButton } from './TextButton';

afterEach(cleanup);

describe('TextButton', () => {
  it('renders a native button of type button named by its text', () => {
    render(<TextButton onClick={() => undefined}>Example change</TextButton>);

    const button = screen.getByRole('button', { name: 'Example change' });

    expect(button.tagName).toBe('BUTTON');
    expect(button.getAttribute('type')).toBe('button');
  });

  it('calls onClick on a click, on Enter and on Space', async () => {
    const user = userEvent.setup();
    let activationCount = 0;
    render(<TextButton onClick={() => { activationCount += 1; }}>Example activation</TextButton>);

    await user.click(screen.getByRole('button', { name: 'Example activation' }));
    await user.keyboard('{Enter}');
    await user.keyboard(' ');

    expect(activationCount).toBe(3);
  });

  it('renders aria-expanded from isExpanded and leaves it out when no state is given', () => {
    const { rerender } = render(<TextButton isExpanded={false} onClick={() => undefined}>Example toggle</TextButton>);
    const button = screen.getByRole('button', { name: 'Example toggle' });

    expect(button.getAttribute('aria-expanded')).toBe('false');
    rerender(<TextButton isExpanded onClick={() => undefined}>Example toggle</TextButton>);
    expect(button.getAttribute('aria-expanded')).toBe('true');
    rerender(<TextButton onClick={() => undefined}>Example toggle</TextButton>);
    expect(button.hasAttribute('aria-expanded')).toBe(false);
  });

  it('blocks activation when disabled', async () => {
    const user = userEvent.setup();
    let activationCount = 0;
    render(<TextButton isDisabled onClick={() => { activationCount += 1; }}>Example disabled</TextButton>);
    const button = screen.getByRole('button', { name: 'Example disabled' });

    await user.click(button);

    expect(button.hasAttribute('disabled')).toBe(true);
    expect(activationCount).toBe(0);
  });

  it('hands its button element to the ref, so a caller can return focus to it', () => {
    const buttonReference = createRef<HTMLButtonElement>();
    render(<TextButton onClick={() => undefined} ref={buttonReference}>Example focus target</TextButton>);

    buttonReference.current?.focus();

    expect(buttonReference.current).toBe(screen.getByRole('button', { name: 'Example focus target' }));
    expect(document.activeElement).toBe(buttonReference.current);
  });

  it('hides the leading icon, so the name stays the text alone', () => {
    render(<TextButton leadingIcon="edit" onClick={() => undefined}>Example edit</TextButton>);

    expect(screen.getByRole('button', { name: 'Example edit' })).toBeDefined();
    expect(screen.getByText('edit').getAttribute('aria-hidden')).toBe('true');
  });
});
