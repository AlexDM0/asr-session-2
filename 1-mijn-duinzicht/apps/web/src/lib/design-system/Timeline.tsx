import { useDesignSystemCopy } from './DesignSystemCopy';
import { Icon }                from './Icon';
import type { StepState }      from './ProgressSteps';
import styles                  from './Timeline.module.css';
import { VisuallyHidden }      from './VisuallyHidden';

export interface TimelineStep {
  readonly title:       string;
  readonly description: string;
  readonly state:       StepState;
}

export interface TimelineProps {
  readonly steps:            readonly TimelineStep[];
  readonly accessibleLabel?: string;
}

const ICON_NAME_BY_STEP_STATE: Readonly<Record<StepState, string>> = {
  done:    'check_circle',
  current: 'radio_button_checked',
  todo:    'radio_button_unchecked',
};

export function Timeline({ steps, accessibleLabel }: TimelineProps) {
  const copy = useDesignSystemCopy();
  return (
    <ol aria-label={accessibleLabel} className={styles['timeline']}>
      {steps.map((step, stepIndex) => (
        <li
          aria-current={step.state === 'current' ? 'step' : undefined}
          className={styles['step']}
          data-state={step.state}
          // Steps have no identity of their own; an item is its position in the sequence.
           
          key={stepIndex}
        >
          <span aria-hidden="true" className={styles['marker']}>
            <Icon name={ICON_NAME_BY_STEP_STATE[step.state]} />
            <span className={styles['connector']} />
          </span>
          <span className={styles['text']}>
            <VisuallyHidden>{copy.timelineStateLabels[step.state]}</VisuallyHidden>
            <span className={styles['title']}>{step.title}</span>
            <span className={styles['description']}>{step.description}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
