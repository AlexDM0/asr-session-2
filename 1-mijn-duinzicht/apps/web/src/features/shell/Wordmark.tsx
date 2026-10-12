import { Link } from 'react-router';

import { PortalPath } from '../../shared/sections/PortalPath';

import styles         from './Wordmark.module.css';
import { SHELL_COPY } from './shellCopy';

/** The logotype, leading to the overview; its visible letters are hidden so the link has one clear name. */
export function Wordmark() {
  return (
    <Link aria-label={SHELL_COPY.wordmarkLinkName} className={styles['wordmark']} to={PortalPath.overview()}>
      <span aria-hidden="true" className={styles['name']}>
        {SHELL_COPY.wordmarkName}
        <span className={styles['dot']}>{SHELL_COPY.wordmarkDot}</span>
      </span>
      <span aria-hidden="true" className={styles['tagline']}>{SHELL_COPY.wordmarkTagline}</span>
    </Link>
  );
}
