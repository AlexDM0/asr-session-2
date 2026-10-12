/**
 * The column is the page frame every section uses, so what matters is that its width variant reaches
 * the stylesheet and that it renders as the element the caller asks for.
 */
import { cleanup, render, screen } from '@testing-library/react';
import {
  afterEach,
  describe,
  expect,
  it,
} from 'bun:test';

import { ContentColumn } from './ContentColumn';

afterEach(cleanup);

describe('ContentColumn', () => {
  it('renders a regular-width div by default', () => {
    render(<ContentColumn>Example content</ContentColumn>);

    const column = screen.getByText('Example content');

    expect(column.tagName).toBe('DIV');
    expect(column.dataset['width']).toBe('regular');
  });

  it('mirrors the narrow width as data-width', () => {
    render(<ContentColumn width="narrow">Example content</ContentColumn>);

    expect(screen.getByText('Example content').dataset['width']).toBe('narrow');
  });

  it('renders as the requested element', () => {
    for (const elementName of ['section', 'main'] as const) {
      const { unmount } = render(<ContentColumn as={elementName}>Example content</ContentColumn>);

      expect(screen.getByText('Example content').tagName).toBe(elementName.toUpperCase());
      unmount();
    }
  });
});
