import { useRef }                    from 'react';
import { Outlet, ScrollRestoration } from 'react-router';

import { PortalHeader }            from './PortalHeader';
import styles                      from './PortalLayout.module.css';
import { SkipLink }                from './SkipLink';
import { useMainContentFocus }     from './useMainContentFocus';
import { useSectionDocumentTitle } from './useSectionDocumentTitle';

export const MAIN_CONTENT_ID = 'main-content';

/** The shell around every page: the skip link, the header, then the main content the route renders. */
export function PortalLayout() {
  const mainContentReference = useRef<HTMLElement>(null);
  useMainContentFocus(mainContentReference);
  useSectionDocumentTitle();
  return (
    <>
      <SkipLink targetId={MAIN_CONTENT_ID} />
      <PortalHeader />
      <main className={styles['mainContent']} id={MAIN_CONTENT_ID} ref={mainContentReference} tabIndex={-1}>
        <Outlet />
      </main>
      <ScrollRestoration />
    </>
  );
}
