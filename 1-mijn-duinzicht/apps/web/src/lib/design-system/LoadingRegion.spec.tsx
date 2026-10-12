/**
 * The loading region carries the one loading announcement every view uses, so what matters is that it
 * marks itself busy, announces the provider's text through a status role and still shows the skeleton
 * it wraps. Copy here is synthetic English.
 */
import { cleanup, render, screen } from '@testing-library/react';
import {
  afterEach,
  describe,
  expect,
  it,
} from 'bun:test';

import { DesignSystemCopyProvider, type DesignSystemCopy } from './DesignSystemCopy';
import { LoadingRegion }                                   from './LoadingRegion';

const EXAMPLE_COPY: DesignSystemCopy = {
  loadingAnnouncement:      'Example loading',
  retryAction:              'Example retry',
  defaultErrorMessage:      'Example error message',
  compactErrorMessage:      'Example short error',
  breadcrumbNavigationName: 'Example trail',
  timelineStateLabels:      { done: 'Example done', current: 'Example current', todo: 'Example to do' },
  progressStepsText:        (doneCount, totalCount) => `Example ${doneCount} of ${totalCount}`,
};

afterEach(cleanup);

describe('LoadingRegion', () => {
  it('announces the provider\'s loading text through a status role inside a busy region', () => {
    render(
      <DesignSystemCopyProvider copy={EXAMPLE_COPY}>
        <LoadingRegion>
          <span>Example skeleton</span>
        </LoadingRegion>
      </DesignSystemCopyProvider>,
    );

    const status = screen.getByRole('status');

    expect(status.textContent).toBe('Example loading');
    expect(status.closest('[aria-busy="true"]')).not.toBeNull();
  });

  it('renders the skeleton it wraps inside the busy region', () => {
    render(
      <DesignSystemCopyProvider copy={EXAMPLE_COPY}>
        <LoadingRegion>
          <span>Example skeleton</span>
        </LoadingRegion>
      </DesignSystemCopyProvider>,
    );

    expect(screen.getByText('Example skeleton').closest('[aria-busy="true"]')).not.toBeNull();
  });
});
