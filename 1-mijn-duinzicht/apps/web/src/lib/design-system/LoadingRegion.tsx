import type { ReactNode } from 'react';

import { useDesignSystemCopy } from './DesignSystemCopy';
import styles                  from './LoadingRegion.module.css';
import { VisuallyHidden }      from './VisuallyHidden';

export interface LoadingRegionProps {
  /** Skeleton blocks shaped like the content they replace. */
  readonly children: ReactNode;
}

/** Marks a view as busy and gives it the one loading announcement, so no feature words its own. */
export function LoadingRegion({ children }: LoadingRegionProps) {
  const copy = useDesignSystemCopy();
  return (
    <div aria-busy="true" className={styles['loadingRegion']}>
      <VisuallyHidden>
        <span role="status">{copy.loadingAnnouncement}</span>
      </VisuallyHidden>
      {children}
    </div>
  );
}
