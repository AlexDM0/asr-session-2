/**
 * Toggle is an on-off switch, so what matters is the switch semantics (role, checked
 * state, the name and description borrowed from the caller's visible text), that click, Space and
 * Enter report the inverted value without the switch deciding its own state, that disabling blocks
 * it, and that with children the whole row is the one switch.
 */
import { cleanup, render, screen } from '@testing-library/react';
import userEvent                   from '@testing-library/user-event';
import {
  afterEach,
  describe,
  expect,
  it
} from 'bun:test';
import { useState } from 'react';

import { Toggle } from './Toggle';

afterEach(cleanup);

function ExampleToggleRow({ initialIsChecked }: { readonly initialIsChecked: boolean }) {
  const [isChecked, setIsChecked] = useState(initialIsChecked);
  return (
    <div>
      <span id="example-title">Example preference</span>
      <span id="example-description">Example description</span>
      <Toggle descriptionId="example-description" isChecked={isChecked} labelId="example-title" onChange={setIsChecked} />
    </div>
  );
}

describe('Toggle', () => {
  it('is a switch named and described by the given ids, reporting its checked state', () => {
    render(<ExampleToggleRow initialIsChecked />);

    const toggle = screen.getByRole('switch', { name: 'Example preference' });

    expect(toggle.tagName).toBe('BUTTON');
    expect(toggle.getAttribute('type')).toBe('button');
    expect(toggle.getAttribute('aria-checked')).toBe('true');
    expect(toggle.getAttribute('aria-describedby')).toBe('example-description');
  });

  it('reports the inverted value on a click, on Space and on Enter', async () => {
    const user = userEvent.setup();
    render(<ExampleToggleRow initialIsChecked={false} />);
    const toggle = screen.getByRole('switch', { name: 'Example preference' });

    await user.click(toggle);
    expect(toggle.getAttribute('aria-checked')).toBe('true');
    await user.keyboard(' ');
    expect(toggle.getAttribute('aria-checked')).toBe('false');
    await user.keyboard('{Enter}');
    expect(toggle.getAttribute('aria-checked')).toBe('true');
  });

  it('leaves the checked state to the caller instead of changing it itself', async () => {
    const user = userEvent.setup();
    const reportedValues: boolean[] = [];
    render(
      <>
        <span id="example-fixed-title">Example fixed</span>
        <Toggle isChecked={false} labelId="example-fixed-title" onChange={(isChecked) => reportedValues.push(isChecked)} />
      </>,
    );
    const toggle = screen.getByRole('switch', { name: 'Example fixed' });

    await user.click(toggle);

    expect(reportedValues).toEqual([true]);
    expect(toggle.getAttribute('aria-checked')).toBe('false');
  });

  it('blocks every activation when disabled', async () => {
    const user = userEvent.setup();
    const reportedValues: boolean[] = [];
    render(
      <>
        <span id="example-disabled-title">Example disabled</span>
        <Toggle isChecked isDisabled labelId="example-disabled-title" onChange={(isChecked) => reportedValues.push(isChecked)} />
      </>,
    );
    const toggle = screen.getByRole('switch', { name: 'Example disabled' });

    await user.click(toggle);
    toggle.focus();
    await user.keyboard(' ');

    expect(toggle.hasAttribute('disabled')).toBe(true);
    expect(reportedValues).toEqual([]);
  });

  it('is the track alone without children', () => {
    render(
      <>
        <span id="example-track-title">Example track</span>
        <Toggle isChecked={false} labelId="example-track-title" onChange={() => undefined} />
      </>,
    );

    const toggle = screen.getByRole('switch', { name: 'Example track' });

    expect(toggle.dataset['hasRow']).toBe('false');
    expect(toggle.textContent).toBe('');
  });

  it('makes the whole row the switch when given children, keeping the name and description ids', async () => {
    const user = userEvent.setup();
    const reportedValues: boolean[] = [];
    render(
      <Toggle descriptionId="example-row-description" isChecked labelId="example-row-title" onChange={(isChecked) => reportedValues.push(isChecked)}>
        <span id="example-row-title">Example row title</span>
        <span id="example-row-description">Example row description</span>
      </Toggle>,
    );
    const toggle = screen.getByRole('switch', { name: 'Example row title' });

    await user.click(screen.getByText('Example row description'));

    expect(toggle.dataset['hasRow']).toBe('true');
    expect(toggle.getAttribute('aria-describedby')).toBe('example-row-description');
    expect(reportedValues).toEqual([false]);
  });
});
