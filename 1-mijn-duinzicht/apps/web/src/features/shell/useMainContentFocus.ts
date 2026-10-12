import { useEffect, useRef, type RefObject } from 'react';
import { useLocation }                       from 'react-router';

/**
 * After every navigation, focuses the main content without scrolling, so the next Tab starts inside the new page.
 * The first render leaves focus at the document, because the skip link must stay the first Tab.
 */
export function useMainContentFocus(mainContentReference: RefObject<HTMLElement | null>): void {
  const location = useLocation();
  const previousLocationKeyReference = useRef<string | null>(null);

  useEffect(() => {
    const previousLocationKey = previousLocationKeyReference.current;
    previousLocationKeyReference.current = location.key;
    if (previousLocationKey === null || previousLocationKey === location.key) {
      return;
    }
    mainContentReference.current?.focus({ preventScroll: true });
  }, [location.key, mainContentReference]);
}
