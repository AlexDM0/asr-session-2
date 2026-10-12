import type { ReactNode } from 'react';

import styles from './ContentColumn.module.css';

export interface ContentColumnProps {
  readonly width?:   'regular' | 'narrow';
  readonly as?:      'div' | 'section' | 'main';
  readonly children: ReactNode;
}

/** The centred page column: `--max` or `--max-narrow` wide with `--gutter` at each side, as every design lays out its content. */
export function ContentColumn({ width = 'regular', as: ElementName = 'div', children }: ContentColumnProps) {
  return (
    <ElementName className={styles['contentColumn']} data-width={width}>
      {children}
    </ElementName>
  );
}
