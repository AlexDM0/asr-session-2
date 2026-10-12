/**
 * The error banner is every view's failure state, so what matters is that it is announced, shows the
 * given or the provider's message, that the compact variant always uses the short message without an
 * icon, and that the retry is a real button that works by mouse and keyboard unless it is disabled.
 * Copy here is synthetic English.
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

import { DesignSystemCopyProvider, type DesignSystemCopy } from './DesignSystemCopy';
import { ErrorBanner, type ErrorBannerProps }              from './ErrorBanner';

const EXAMPLE_COPY: DesignSystemCopy = {
  loadingAnnouncement:      'Example loading',
  retryAction:              'Example retry',
  defaultErrorMessage:      'Example error message',
  compactErrorMessage:      'Example short error',
  breadcrumbNavigationName: 'Example trail',
  timelineStateLabels:      { done: 'Example done', current: 'Example current', todo: 'Example to do' },
  progressStepsText:        (doneCount, totalCount) => `Example ${doneCount} of ${totalCount}`,
};

function renderErrorBanner(props: ErrorBannerProps): void {
  render(
    <DesignSystemCopyProvider copy={EXAMPLE_COPY}>
      <ErrorBanner {...props} />
    </DesignSystemCopyProvider>,
  );
}

afterEach(cleanup);

describe('ErrorBanner', () => {
  it('is an alert showing the provider\'s default message and a decorative error icon', () => {
    renderErrorBanner({ onRetry: () => undefined });

    const banner = screen.getByRole('alert');

    expect(banner.textContent).toContain('Example error message');
    expect(banner.dataset['variant']).toBe('regular');
    expect(screen.getByText('error').getAttribute('aria-hidden')).toBe('true');
  });

  it('shows the message the view gives instead of the default', () => {
    renderErrorBanner({ message: 'Example specific failure', onRetry: () => undefined });

    expect(screen.getByRole('alert').textContent).toContain('Example specific failure');
    expect(screen.queryByText('Example error message')).toBeNull();
  });

  it('shows the provider\'s compact message without an icon in the compact variant', () => {
    renderErrorBanner({ message: 'Example ignored message', onRetry: () => undefined, variant: 'compact' });

    const banner = screen.getByRole('alert');

    expect(banner.dataset['variant']).toBe('compact');
    expect(banner.textContent).toContain('Example short error');
    expect(banner.textContent).not.toContain('Example ignored message');
    expect(screen.queryByText('error')).toBeNull();
  });

  it('offers the retry as a native button named by the provider\'s retry text', () => {
    renderErrorBanner({ onRetry: () => undefined });

    const retryButton = screen.getByRole('button', { name: 'Example retry' });

    expect(retryButton.tagName).toBe('BUTTON');
    expect(retryButton.getAttribute('type')).toBe('button');
  });

  it('calls onRetry on click, Enter and Space', async () => {
    const user = userEvent.setup();
    const onRetry = mock(() => undefined);
    renderErrorBanner({ onRetry });

    await user.click(screen.getByRole('button', { name: 'Example retry' }));
    await user.keyboard('{Enter}');
    await user.keyboard(' ');

    expect(onRetry).toHaveBeenCalledTimes(3);
  });

  it('blocks the retry while isRetryDisabled is set', async () => {
    const user = userEvent.setup();
    const onRetry = mock(() => undefined);
    renderErrorBanner({ isRetryDisabled: true, onRetry });

    const retryButton = screen.getByRole('button', { name: 'Example retry' });
    await user.click(retryButton);

    expect(retryButton.hasAttribute('disabled')).toBe(true);
    expect(onRetry).not.toHaveBeenCalled();
  });
});
