import type { ReactNode } from 'react';
import { Link }           from 'react-router';

import { Icon }                            from './Icon';
import { IconCircle, type IconCircleTone } from './IconCircle';
import styles                              from './LinkCard.module.css';

export interface LinkCardProps {
  readonly to:             string;
  readonly title:          string;
  readonly subtitle?:      string;
  readonly leadingIcon?:   { readonly icon: string; readonly tone?: IconCircleTone };
  readonly variant?:       'raised' | 'flat';
  readonly titleEmphasis?: 'strong' | 'regular';
  readonly titleSuffix?:   ReactNode;
  readonly titleSize?:     'regular' | 'large';
}

export function LinkCard({
  to,
  title,
  subtitle,
  leadingIcon,
  variant = 'raised',
  titleEmphasis = 'strong',
  titleSuffix,
  titleSize = 'regular',
}: LinkCardProps) {
  return (
    <Link className={styles['linkCard']} data-title-emphasis={titleEmphasis} data-title-size={titleSize} data-variant={variant} to={to}>
      {leadingIcon === undefined ? null : <IconCircle icon={leadingIcon.icon} size="small" tone={leadingIcon.tone ?? 'sage'} />}
      <span className={styles['text']}>
        <span className={styles['title']}>
          {title}
          {titleSuffix}
        </span>
        {subtitle === undefined ? null : <span className={styles['subtitle']}>{subtitle}</span>}
      </span>
      <Icon name="chevron_right" />
    </Link>
  );
}
