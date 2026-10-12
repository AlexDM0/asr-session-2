import type { ReactNode } from 'react';

import styles from './VisuallyHidden.module.css';

export interface VisuallyHiddenProps {
  readonly children: ReactNode;
  readonly as?:      'span' | 'div';
}

export function VisuallyHidden({ children, as: ElementName = 'span' }: VisuallyHiddenProps) {
  return <ElementName className={styles['visuallyHidden']}>{children}</ElementName>;
}
