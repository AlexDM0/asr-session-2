/**
 * ProgressSteps is a picture of a claim's progress, so what matters is that it is one image named
 * by the provider's progress text computed from the step states (or by the caller's label), that
 * each bar is hidden and carries its state, and that the highlight of the current step reaches the
 * stylesheet. Copy here is synthetic English.
 */
import { cleanup, render, screen } from '@testing-library/react';
import {
  afterEach,
  describe,
  expect,
  it
} from 'bun:test';
import type { ReactNode } from 'react';

import { DesignSystemCopyProvider, type DesignSystemCopy } from './DesignSystemCopy';
import { ProgressSteps }                                   from './ProgressSteps';

afterEach(cleanup);

const EXAMPLE_COPY: DesignSystemCopy = {
  loadingAnnouncement:      'Example loading',
  retryAction:              'Example retry',
  defaultErrorMessage:      'Example error message',
  compactErrorMessage:      'Example short error',
  breadcrumbNavigationName: 'Example trail',
  timelineStateLabels:      { done: 'Example done', current: 'Example current', todo: 'Example to do' },
  progressStepsText:        (doneCount, totalCount) => `Example ${doneCount} of ${totalCount} done`,
};

function renderWithCopy(children: ReactNode) {
  return render(<DesignSystemCopyProvider copy={EXAMPLE_COPY}>{children}</DesignSystemCopyProvider>);
}

describe('ProgressSteps', () => {
  it('is one image named by the provider text computed from the done and total step counts', () => {
    renderWithCopy(<ProgressSteps stepStates={['done', 'done', 'current', 'todo']} />);

    expect(screen.getByRole('img', { name: 'Example 2 of 4 done' })).toBeDefined();
  });

  it('is named by the caller label when one is given', () => {
    renderWithCopy(<ProgressSteps accessibleLabel="Example own label" stepStates={['done', 'todo']} />);

    expect(screen.getByRole('img', { name: 'Example own label' })).toBeDefined();
  });

  it('renders one hidden bar per step carrying its state, in order', () => {
    renderWithCopy(<ProgressSteps stepStates={['done', 'current', 'todo']} />);

    const bars = [...screen.getByRole('img').children];

    expect(bars.map((bar) => bar.getAttribute('data-state'))).toEqual(['done', 'current', 'todo']);
    expect(bars.every((bar) => bar.getAttribute('aria-hidden') === 'true')).toBe(true);
  });

  it('does not highlight the current step unless asked to', () => {
    const { rerender } = renderWithCopy(<ProgressSteps stepStates={['current', 'todo']} />);
    const progressSteps = screen.getByRole('img');

    expect(progressSteps.dataset['currentIsHighlighted']).toBe('false');
    rerender(
      <DesignSystemCopyProvider copy={EXAMPLE_COPY}>
        <ProgressSteps currentIsHighlighted stepStates={['current', 'todo']} />
      </DesignSystemCopyProvider>,
    );
    expect(progressSteps.dataset['currentIsHighlighted']).toBe('true');
  });
});
