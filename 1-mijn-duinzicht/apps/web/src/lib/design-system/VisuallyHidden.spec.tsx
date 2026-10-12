/**
 * Visually hidden text is how icon-only and state-only parts get their names, so what matters is that
 * the text stays in the accessibility tree (it names the control around it) and that it renders as
 * the requested element, because a `div` inside a `span` would be invalid markup.
 */
import { render, screen }       from '@testing-library/react';
import { describe, expect, it } from 'bun:test';

import { VisuallyHidden } from './VisuallyHidden';

describe('VisuallyHidden', () => {
  it('keeps its content in the accessibility tree, where it names the control around it', () => {
    render(
      <button type="button">
        <VisuallyHidden>Example label</VisuallyHidden>
      </button>,
    );

    expect(screen.getByRole('button', { name: 'Example label' })).toBeDefined();
    expect(screen.getByText('Example label').getAttribute('aria-hidden')).toBeNull();
  });

  it('renders as a span by default', () => {
    render(<VisuallyHidden>Example inline text</VisuallyHidden>);

    expect(screen.getByText('Example inline text').tagName).toBe('SPAN');
  });

  it('renders as a div when asked to', () => {
    render(<VisuallyHidden as="div">Example block text</VisuallyHidden>);

    expect(screen.getByText('Example block text').tagName).toBe('DIV');
  });
});
