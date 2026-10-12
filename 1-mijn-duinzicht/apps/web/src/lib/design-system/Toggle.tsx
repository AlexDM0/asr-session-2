import type { ReactNode } from 'react';

import styles from './Toggle.module.css';

export interface ToggleProps {
  readonly isChecked:      boolean;
  readonly onChange:       (isChecked: boolean) => void;
  readonly labelId:        string;
  readonly descriptionId?: string;
  readonly isDisabled?:    boolean;
  readonly children?:      ReactNode;
}

/** With children the whole row is the switch, so the focus outline surrounds the title, description and track together. */
export function Toggle({
  isChecked,
  onChange,
  labelId,
  descriptionId,
  isDisabled = false,
  children,
}: ToggleProps) {
  const hasRow = children !== undefined;
  return (
    <button
      aria-checked={isChecked}
      aria-describedby={descriptionId}
      aria-labelledby={labelId}
      className={styles['toggle']}
      data-has-row={hasRow}
      disabled={isDisabled}
      onClick={() => onChange(!isChecked)}
      role="switch"
      type="button"
    >
      {hasRow ? <span className={styles['rowContent']}>{children}</span> : null}
      <span className={styles['track']}>
        <span className={styles['knob']} />
      </span>
    </button>
  );
}
