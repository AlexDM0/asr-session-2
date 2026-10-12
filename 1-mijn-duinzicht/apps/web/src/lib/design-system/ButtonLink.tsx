import type { ReactNode } from 'react';

import { Link } from 'react-router';

import styles   from './ButtonLink.module.css';
import { Icon } from './Icon';

export type ButtonLinkVariant = 'primary' | 'secondary' | 'outline';
export type ButtonLinkSize = 'regular' | 'small';

interface ButtonLinkAppearance {
  readonly variant:      ButtonLinkVariant;
  readonly size?:        ButtonLinkSize;
  readonly leadingIcon?: string;
  readonly children:     ReactNode;
}

interface RouterDestination {
  readonly to: string;
}

interface DownloadDestination {
  readonly href:             string;
  readonly downloadFileName: string;
}

export type ButtonLinkProps = ButtonLinkAppearance & (RouterDestination | DownloadDestination);

/** Navigation that looks like a button: a router link, or a plain anchor that downloads a file. */
export function ButtonLink(props: ButtonLinkProps) {
  const size = props.size ?? 'regular';
  const content = (
    <>
      {props.leadingIcon !== undefined && <Icon name={props.leadingIcon} size="medium" />}
      {props.children}
    </>
  );
  if ('to' in props) {
    return (
      <Link className={styles['buttonLink']} data-size={size} data-variant={props.variant} to={props.to}>
        {content}
      </Link>
    );
  }
  return (
    <a className={styles['buttonLink']} data-size={size} data-variant={props.variant} download={props.downloadFileName} href={props.href}>
      {content}
    </a>
  );
}
