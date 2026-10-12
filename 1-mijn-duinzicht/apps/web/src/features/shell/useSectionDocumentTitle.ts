import { useEffect } from 'react';

import { useLeafPortalRoute } from './PortalRouteHandle';
import { SHELL_COPY }         from './shellCopy';

/** Names the browser tab after the section of the current route. */
export function useSectionDocumentTitle(): void {
  const { section } = useLeafPortalRoute();
  useEffect(() => {
    document.title = SHELL_COPY.documentTitles[section];
  }, [section]);
}
