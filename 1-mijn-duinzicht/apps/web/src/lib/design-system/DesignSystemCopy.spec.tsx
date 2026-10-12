/**
 * The design system words nothing itself, so what matters is that a part reads exactly the copy the
 * application supplies, including the computed progress text, and that a part rendered without the
 * provider fails loudly instead of showing empty or invented text. Copy here is synthetic English.
 */
import { render, screen }       from '@testing-library/react';
import { describe, expect, it } from 'bun:test';

import { DesignSystemCopyProvider, useDesignSystemCopy, type DesignSystemCopy } from './DesignSystemCopy';

const EXAMPLE_COPY: DesignSystemCopy = {
  loadingAnnouncement:      'Example loading',
  retryAction:              'Example retry',
  defaultErrorMessage:      'Example error message',
  compactErrorMessage:      'Example short error',
  breadcrumbNavigationName: 'Example trail',
  timelineStateLabels:      { done: 'Example done', current: 'Example current', todo: 'Example to do' },
  progressStepsText:        (doneCount, totalCount) => `Example ${doneCount} of ${totalCount}`,
};

function ExampleCopyReader() {
  const copy = useDesignSystemCopy();
  return (
    <p>
      {copy.loadingAnnouncement} | {copy.timelineStateLabels.current} | {copy.progressStepsText(2, 4)}
    </p>
  );
}

describe('DesignSystemCopy', () => {
  it('lets a part read the copy supplied by the provider, including the computed progress text', () => {
    render(
      <DesignSystemCopyProvider copy={EXAMPLE_COPY}>
        <ExampleCopyReader />
      </DesignSystemCopyProvider>,
    );

    expect(screen.getByText('Example loading | Example current | Example 2 of 4')).toBeDefined();
  });

  it('throws when a part reads the copy without a provider, so no part renders without its wording', () => {
    expect(() => render(<ExampleCopyReader />)).toThrow('DesignSystemCopyProvider');
  });
});
