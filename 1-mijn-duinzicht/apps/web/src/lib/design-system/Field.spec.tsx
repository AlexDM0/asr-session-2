/**
 * Field is the design system's form input, so what matters is the accessible wiring: the label
 * names the control, the hint and the error message describe it, the error state is announced as
 * invalid, typing reports each new value, read-only and disabled states hold, and a caller can move
 * focus to the control through its ref.
 */
import { cleanup, render, screen } from '@testing-library/react';
import userEvent                   from '@testing-library/user-event';
import {
  afterEach,
  describe,
  expect,
  it
} from 'bun:test';
import { createRef, useState } from 'react';

import { Field, type FieldTextControl } from './Field';

afterEach(cleanup);

function ControlledExampleField() {
  const [value, setValue] = useState('');
  return <Field label="Example label" name="exampleName" onChange={setValue} value={value} />;
}

describe('Field', () => {
  it('ties the label to a text input carrying the given name and value', () => {
    render(<Field label="Example label" name="exampleName" onChange={() => undefined} value="Example value" />);

    const input = screen.getByRole('textbox', { name: 'Example label' });

    expect(input.tagName).toBe('INPUT');
    expect(input.getAttribute('type')).toBe('text');
    expect(input.getAttribute('name')).toBe('exampleName');
    expect((input as HTMLInputElement).value).toBe('Example value');
  });

  it('reports every typed value through onChange', async () => {
    const user = userEvent.setup();
    render(<ControlledExampleField />);
    const input = screen.getByRole('textbox', { name: 'Example label' });

    await user.type(input, 'Example typing');

    expect((input as HTMLInputElement).value).toBe('Example typing');
  });

  it('renders the requested input type and the optional input attributes', () => {
    render(
      <Field
        autoComplete="email"
        inputMode="email"
        label="Example email"
        name="exampleEmail"
        onChange={() => undefined}
        placeholder="Example placeholder"
        type="email"
        value=""
      />,
    );

    const input = screen.getByRole('textbox', { name: 'Example email' });

    expect(input.getAttribute('type')).toBe('email');
    expect(input.getAttribute('inputmode')).toBe('email');
    expect(input.getAttribute('autocomplete')).toBe('email');
    expect(input.getAttribute('placeholder')).toBe('Example placeholder');
  });

  it('renders a textarea with the given number of rows when rows is set', () => {
    render(<Field label="Example description" name="exampleDescription" onChange={() => undefined} rows={6} value="" />);

    const textarea = screen.getByRole('textbox', { name: 'Example description' });

    expect(textarea.tagName).toBe('TEXTAREA');
    expect(textarea.getAttribute('rows')).toBe('6');
  });

  it('links the hint and the error message through aria-describedby and marks the error state invalid', () => {
    render(
      <Field errorMessage="Example error" hint="Example hint" label="Example label" name="exampleName" onChange={() => undefined} value="" />,
    );

    const input = screen.getByRole('textbox', { name: 'Example label' });
    const describingTexts = (input.getAttribute('aria-describedby') ?? '')
      .split(' ')
      .map((describingId) => document.getElementById(describingId)?.textContent);

    expect(describingTexts).toEqual(['Example hint', 'Example error']);
    expect(input.getAttribute('aria-invalid')).toBe('true');
  });

  it('is neither described nor invalid without a hint or an error message', () => {
    render(<Field label="Example label" name="exampleName" onChange={() => undefined} value="" />);

    const input = screen.getByRole('textbox', { name: 'Example label' });

    expect(input.hasAttribute('aria-describedby')).toBe(false);
    expect(input.hasAttribute('aria-invalid')).toBe(false);
  });

  it('applies the read-only and disabled states to the control', () => {
    render(
      <>
        <Field isReadOnly label="Example read-only" name="exampleReadOnly" onChange={() => undefined} value="" />
        <Field isDisabled label="Example disabled" name="exampleDisabled" onChange={() => undefined} value="" />
      </>,
    );

    expect(screen.getByRole('textbox', { name: 'Example read-only' }).hasAttribute('readonly')).toBe(true);
    expect(screen.getByRole('textbox', { name: 'Example disabled' }).hasAttribute('disabled')).toBe(true);
  });

  it('hands its control to the ref, so a caller can move focus to it', () => {
    const controlReference = createRef<FieldTextControl>();
    render(<Field label="Example focus" name="exampleFocus" onChange={() => undefined} ref={controlReference} value="" />);

    controlReference.current?.focus();

    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Example focus' }));
  });
});
