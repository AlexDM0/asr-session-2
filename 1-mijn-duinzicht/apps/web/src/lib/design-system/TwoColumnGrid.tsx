import type { CSSProperties, ReactNode } from 'react';

import styles from './TwoColumnGrid.module.css';

export interface TwoColumnGridProps {
  readonly template:    string;
  readonly gap:         'space16' | 'space24' | 'space40';
  readonly alignItems?: 'start' | 'stretch';
  readonly children:    ReactNode;
}

type TemplateStyle = CSSProperties & Readonly<Record<'--two-column-template', string>>;

/** The wide-mode template travels as a custom property; in compact layout mode the stylesheet stacks the children in source order. */
export function TwoColumnGrid({
  template,
  gap,
  alignItems = 'stretch',
  children,
}: TwoColumnGridProps) {
  const templateStyle: TemplateStyle = { '--two-column-template': template };
  return (
    <div className={styles['twoColumnGrid']} data-align-items={alignItems} data-gap={gap} style={templateStyle}>
      {children}
    </div>
  );
}
