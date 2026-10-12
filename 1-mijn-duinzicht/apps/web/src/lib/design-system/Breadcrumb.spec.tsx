/**
 * The breadcrumb names where the page sits, so what matters is the named navigation landmark, the
 * ordered list, that earlier items lead back while the last one is the current page, and that the
 * separators are never read out. Copy here is synthetic English.
 */
import { cleanup, render, screen } from '@testing-library/react';
import {
  afterEach,
  describe,
  expect,
  it,
} from 'bun:test';
import { MemoryRouter } from 'react-router';

import { Breadcrumb }                                      from './Breadcrumb';
import { DesignSystemCopyProvider, type DesignSystemCopy } from './DesignSystemCopy';

const EXAMPLE_COPY: DesignSystemCopy = {
  loadingAnnouncement:      'Example loading',
  retryAction:              'Example retry',
  defaultErrorMessage:      'Example error message',
  compactErrorMessage:      'Example short error',
  breadcrumbNavigationName: 'Example trail',
  timelineStateLabels:      { done: 'Example done', current: 'Example current', todo: 'Example to do' },
  progressStepsText:        (doneCount, totalCount) => `Example ${doneCount} of ${totalCount}`,
};

function renderExampleBreadcrumb(): void {
  render(
    <MemoryRouter>
      <DesignSystemCopyProvider copy={EXAMPLE_COPY}>
        <Breadcrumb items={[{ label: 'Example home', to: '/example' }, { label: 'Example section', to: '/example/section' }, { label: 'Example page' }]} />
      </DesignSystemCopyProvider>
    </MemoryRouter>,
  );
}

afterEach(cleanup);

describe('Breadcrumb', () => {
  it('is a navigation landmark named by the provider\'s breadcrumb name, holding an ordered list', () => {
    renderExampleBreadcrumb();

    const navigation = screen.getByRole('navigation', { name: 'Example trail' });

    expect(navigation.querySelector('ol')).not.toBeNull();
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
  });

  it('makes every earlier item a link to its destination', () => {
    renderExampleBreadcrumb();

    expect(screen.getByRole('link', { name: 'Example home' }).getAttribute('href')).toBe('/example');
    expect(screen.getByRole('link', { name: 'Example section' }).getAttribute('href')).toBe('/example/section');
  });

  it('shows the last item as plain text marked as the current page', () => {
    renderExampleBreadcrumb();

    const currentPage = screen.getByText('Example page');

    expect(screen.queryByRole('link', { name: 'Example page' })).toBeNull();
    expect(currentPage.getAttribute('aria-current')).toBe('page');
  });

  it('hides the separators from assistive technology', () => {
    renderExampleBreadcrumb();

    const separators = screen.getByRole('navigation').querySelectorAll('[aria-hidden="true"]');

    expect(separators).toHaveLength(2);
    for (const separator of separators) {
      expect(separator.textContent).toBe(' / ');
    }
  });
});
