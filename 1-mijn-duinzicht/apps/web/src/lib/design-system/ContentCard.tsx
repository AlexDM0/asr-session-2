import { useId, type ReactNode } from 'react';

import styles from './ContentCard.module.css';

export type ContentCardPadding = 'space24' | 'space28' | 'space32' | 'space40';

export interface ContentCardProps {
  readonly padding:          ContentCardPadding;
  readonly elevation?:       'raised' | 'flat';
  readonly title?:           string;
  readonly titleLevel?:      2 | 3;
  /** Caps the card at `--max-readable` in wide layout mode; in compact mode it spans its column. */
  readonly isReadableWidth?: boolean;
  readonly children:         ReactNode;
}

export function ContentCard({
  padding,
  elevation = 'flat',
  title,
  titleLevel = 2,
  isReadableWidth = false,
  children,
}: ContentCardProps) {
  const titleId = useId();
  const sharedAttributes = {
    'className':           styles['contentCard'],
    'data-padding':        padding,
    'data-elevation':      elevation,
    'data-readable-width': isReadableWidth,
  };
  if (title === undefined) {
    return <div {...sharedAttributes}>{children}</div>;
  }
  const TitleElement = titleLevel === 2 ? 'h2' : 'h3';
  return (
    <section aria-labelledby={titleId} {...sharedAttributes}>
      <TitleElement className={styles['title']} id={titleId}>{title}</TitleElement>
      {children}
    </section>
  );
}
