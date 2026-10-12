/**
 * Button is the one action control of every feature, so what matters is that it stays a native
 * button (keyboard activation, name from its text, never a form submit by accident), that disabling
 * it really blocks activation, and that the variant and size reach the stylesheet through `data-*`.
 */
import { cleanup, render, screen } from '@testing-library/react';
import userEvent                   from '@testing-library/user-event';
import {
  afterEach,
  describe,
  expect,
  it
} from 'bun:test';

import { Button } from './Button';

afterEach(cleanup);

describe('Button', () => {
  it('renders a native button named by its text that does not submit a form by default', () => {
    render(<Button variant="primary">Example action</Button>);

    const button = screen.getByRole('button', { name: 'Example action' });

    expect(button.tagName).toBe('BUTTON');
    expect(button.getAttribute('type')).toBe('button');
  });

  it('renders a submit button when asked to', () => {
    render(<Button type="submit" variant="primary">Example submit</Button>);

    expect(screen.getByRole('button', { name: 'Example submit' }).getAttribute('type')).toBe('submit');
  });

  it('calls onClick on a click, on Enter and on Space', async () => {
    const user = userEvent.setup();
    let activationCount = 0;
    render(<Button onClick={() => { activationCount += 1; }} variant="secondary">Example activation</Button>);

    await user.click(screen.getByRole('button', { name: 'Example activation' }));
    await user.keyboard('{Enter}');
    await user.keyboard(' ');

    expect(activationCount).toBe(3);
  });

  it('sets native disabled and blocks every activation when isDisabled is set', async () => {
    const user = userEvent.setup();
    let activationCount = 0;
    render(<Button isDisabled onClick={() => { activationCount += 1; }} variant="primary">Example pending</Button>);
    const button = screen.getByRole('button', { name: 'Example pending' });

    await user.click(button);
    button.focus();
    await user.keyboard('{Enter}');

    expect(button.hasAttribute('disabled')).toBe(true);
    expect(activationCount).toBe(0);
  });

  it('mirrors the variant and size as data attributes, with regular as the default size', () => {
    const { unmount } = render(<Button variant="outline">Example outline</Button>);
    const regularButton = screen.getByRole('button', { name: 'Example outline' });

    expect(regularButton.dataset['variant']).toBe('outline');
    expect(regularButton.dataset['size']).toBe('regular');
    unmount();

    render(<Button size="small" variant="secondary">Example small</Button>);
    const smallButton = screen.getByRole('button', { name: 'Example small' });

    expect(smallButton.dataset['variant']).toBe('secondary');
    expect(smallButton.dataset['size']).toBe('small');
  });

  it('hides the leading icon from assistive technology, so the name stays the text alone', () => {
    render(<Button leadingIcon="download" variant="outline">Example download</Button>);

    expect(screen.getByRole('button', { name: 'Example download' })).toBeDefined();
    expect(screen.getByText('download').getAttribute('aria-hidden')).toBe('true');
  });
});
