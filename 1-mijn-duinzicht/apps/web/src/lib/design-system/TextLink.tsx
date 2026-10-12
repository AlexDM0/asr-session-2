import type { ReactNode } from 'react';
import { Link }           from 'react-router';

import { Icon } from './Icon';
import styles   from './TextLink.module.css';

export type TextLinkChevron = 'trailing' | 'leading' | 'none';

export interface TextLinkProps {
  readonly to:       string;
  readonly chevron?: TextLinkChevron;
  readonly children: ReactNode;
}

export function TextLink({ to, chevron = 'trailing', children }: TextLinkProps) {
  return (
    <Link className={styles['textLink']} data-chevron={chevron} to={to}>
      {chevron === 'leading' ? <Icon name="chevron_left" size="medium" /> : null}
      <span className={styles['label']}>{children}</span>
      {chevron === 'trailing' ? <Icon name="chevron_right" size="medium" /> : null}
    </Link>
  );
}
