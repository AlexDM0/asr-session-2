import { useDesignSystemCopy } from './DesignSystemCopy';
import styles                  from './ProgressSteps.module.css';

export type StepState = 'done' | 'current' | 'todo';

export interface ProgressStepsProps {
  readonly stepStates:            readonly StepState[];
  readonly currentIsHighlighted?: boolean;
  readonly accessibleLabel?:      string;
}

export function ProgressSteps({ stepStates, currentIsHighlighted = false, accessibleLabel }: ProgressStepsProps) {
  const copy = useDesignSystemCopy();
  const doneCount = stepStates.filter((stepState) => stepState === 'done').length;
  return (
    <div
      aria-label={accessibleLabel ?? copy.progressStepsText(doneCount, stepStates.length)}
      className={styles['progressSteps']}
      data-current-is-highlighted={currentIsHighlighted}
      role="img"
    >
      {stepStates.map((stepState, stepIndex) => (
        // Steps have no identity of their own; a bar is its position in the sequence.
         
        <span aria-hidden="true" className={styles['bar']} data-state={stepState} key={stepIndex} />
      ))}
    </div>
  );
}
