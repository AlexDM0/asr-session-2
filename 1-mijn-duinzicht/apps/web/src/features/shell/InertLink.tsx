import { useId, type ReactNode } from 'react';

import { VisuallyHidden } from '../../lib/design-system/VisuallyHidden';

import styles         from './InertLink.module.css';
import { SHELL_COPY } from './shellCopy';

export interface InertLinkProps {
  readonly children: ReactNode;
}

/**
 * A designed link with no destination in this demo: focusable and announced as unavailable, without an `href`
 * or handlers, so mouse, Enter and Space change nothing.
 */
export function InertLink({ children }: InertLinkProps) {
  const descriptionId = useId();
  return (
    <>
      <a aria-describedby={descriptionId} aria-disabled="true" className={styles['inertLink']} role="link" tabIndex={0}>
        {children}
      </a>
      <VisuallyHidden>
        <span id={descriptionId}>{SHELL_COPY.unavailableInDemo}</span>
      </VisuallyHidden>
    </>
  );
}
