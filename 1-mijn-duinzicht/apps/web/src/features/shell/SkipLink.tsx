import type { MouseEvent } from 'react';

import styles         from './SkipLink.module.css';
import { SHELL_COPY } from './shellCopy';

export interface SkipLinkProps {
  readonly targetId: string;
}

/**
 * The first focusable element of the page, shown only while focused. It focuses the target itself instead of
 * following the hash, so the address and the router stay untouched.
 */
export function SkipLink({ targetId }: SkipLinkProps) {
  function focusTarget(event: MouseEvent<HTMLAnchorElement>): void {
    event.preventDefault();
    event.currentTarget.ownerDocument.getElementById(targetId)?.focus();
  }

  return (
    <a className={styles['skipLink']} href={`#${targetId}`} onClick={focusTarget}>
      {SHELL_COPY.skipToContent}
    </a>
  );
}
