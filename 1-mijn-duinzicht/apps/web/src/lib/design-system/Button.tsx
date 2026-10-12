import type { ReactNode } from 'react';

import styles   from './Button.module.css';
import { Icon } from './Icon';

export type ButtonVariant = 'primary' | 'secondary' | 'outline';

export type ButtonSize = 'regular' | 'small';

export interface ButtonProps {
  readonly variant:      ButtonVariant;
  readonly size?:        ButtonSize;
  readonly leadingIcon?: string;
  readonly type?:        'button' | 'submit';
  readonly isDisabled?:  boolean;
  readonly onClick?:     () => void;
  readonly children:     ReactNode;
}

/** Disabled keeps its colours (contrast holds); the caller swaps the label to say what is pending. */
export function Button({
  variant,
  size = 'regular',
  leadingIcon,
  type = 'button',
  isDisabled = false,
  onClick,
  children,
}: ButtonProps) {
  return (
    <button className={styles['button']} data-size={size} data-variant={variant} disabled={isDisabled} onClick={onClick} type={type}>
      {leadingIcon === undefined ? null : <Icon name={leadingIcon} size="medium" />}
      {children}
    </button>
  );
}
