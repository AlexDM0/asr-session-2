import type { ReactNode, Ref } from 'react';

import { Icon } from './Icon';
import styles   from './TextButton.module.css';

export interface TextButtonProps {
  readonly onClick:      () => void;
  readonly leadingIcon?: string;
  readonly isExpanded?:  boolean;
  readonly isDisabled?:  boolean;
  readonly ref?:         Ref<HTMLButtonElement>;
  readonly children:     ReactNode;
}

/** Looks like a text link but changes state instead of navigating, so it is a native button. */
export function TextButton({
  onClick,
  leadingIcon,
  isExpanded,
  isDisabled = false,
  ref,
  children,
}: TextButtonProps) {
  return (
    <button aria-expanded={isExpanded} className={styles['textButton']} disabled={isDisabled} onClick={onClick} ref={ref} type="button">
      {leadingIcon === undefined ? null : <Icon name={leadingIcon} size="small" />}
      <span className={styles['label']}>{children}</span>
    </button>
  );
}
