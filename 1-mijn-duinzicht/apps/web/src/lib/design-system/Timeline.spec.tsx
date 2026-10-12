/**
 * Timeline shows where a claim stands, and its icons carry the state only visually, so what matters
 * is that it is an ordered list named by the caller's label, that each item carries the provider's
 * hidden state text, that only the current item is marked as the current step, and that the icons
 * stay out of the accessibility tree. Copy here is synthetic English.
 */
import {
  cleanup,
  render,
  screen,
  within
} from '@testing-library/react';
import {
  afterEach,
  describe,
  expect,
  it
} from 'bun:test';

import { DesignSystemCopyProvider, type DesignSystemCopy } from './DesignSystemCopy';
import { Timeline, type TimelineStep }                     from './Timeline';

afterEach(cleanup);

const EXAMPLE_COPY: DesignSystemCopy = {
  loadingAnnouncement:      'Example loading',
  retryAction:              'Example retry',
  defaultErrorMessage:      'Example error message',
  compactErrorMessage:      'Example short error',
  breadcrumbNavigationName: 'Example trail',
  timelineStateLabels:      { done: 'Example done', current: 'Example current', todo: 'Example to do' },
  progressStepsText:        (doneCount, totalCount) => `Example ${doneCount} of ${totalCount}`,
};

const EXAMPLE_STEPS: readonly TimelineStep[] = [
  { title: 'Example first step', description: 'Example first description', state: 'done' },
  { title: 'Example second step', description: 'Example second description', state: 'current' },
  { title: 'Example third step', description: 'Example third description', state: 'todo' },
];

function renderExampleTimeline() {
  return render(
    <DesignSystemCopyProvider copy={EXAMPLE_COPY}>
      <Timeline accessibleLabel="Example progress" steps={EXAMPLE_STEPS} />
    </DesignSystemCopyProvider>,
  );
}

describe('Timeline', () => {
  it('is an ordered list named by the accessible label with one item per step', () => {
    renderExampleTimeline();

    const timeline = screen.getByRole('list', { name: 'Example progress' });

    expect(timeline.tagName).toBe('OL');
    expect(within(timeline).getAllByRole('listitem')).toHaveLength(3);
  });

  it('gives each item the provider hidden state text before its title and description', () => {
    renderExampleTimeline();

    const itemTexts = screen.getAllByRole('listitem').map((item) => item.textContent);

    expect(itemTexts[0]).toContain('Example doneExample first stepExample first description');
    expect(itemTexts[1]).toContain('Example currentExample second step');
    expect(itemTexts[2]).toContain('Example to doExample third step');
  });

  it('marks only the current item as the current step', () => {
    renderExampleTimeline();

    const currentMarks = screen.getAllByRole('listitem').map((item) => item.getAttribute('aria-current'));

    expect(currentMarks).toEqual([null, 'step', null]);
  });

  it('shows the state icons hidden from assistive technology', () => {
    renderExampleTimeline();

    for (const iconName of ['check_circle', 'radio_button_checked', 'radio_button_unchecked']) {
      expect(screen.getByText(iconName).closest('[aria-hidden="true"]')).not.toBeNull();
    }
  });
});
