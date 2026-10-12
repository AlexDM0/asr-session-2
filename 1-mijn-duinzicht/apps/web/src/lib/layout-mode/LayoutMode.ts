import { useSyncExternalStore } from 'react';

/**
 * The breakpoint reaches CSS as `data-layout` on the root element (`:root[data-layout='compact'] …`),
 * because a custom property cannot be used in a media condition; no stylesheet holds a width query.
 */
export type LayoutMode = 'compact' | 'wide';

export interface LayoutModeTrackingOptions {
  readonly window:           Window;
  readonly breakpointPixels: number;
}

const LAYOUT_ATTRIBUTE = 'data-layout';

export function startLayoutModeTracking(options: LayoutModeTrackingOptions): () => void {
  const compactViewportQuery = options.window.matchMedia(`(width < ${options.breakpointPixels}px)`);
  const rootElement = options.window.document.documentElement;
  const writeLayoutMode = (): void => {
    const layoutMode: LayoutMode = compactViewportQuery.matches ? 'compact' : 'wide';
    rootElement.setAttribute(LAYOUT_ATTRIBUTE, layoutMode);
  };
  writeLayoutMode();
  compactViewportQuery.addEventListener('change', writeLayoutMode);
  return () => compactViewportQuery.removeEventListener('change', writeLayoutMode);
}

function layoutModeOfDocument(): LayoutMode {
  return document.documentElement.getAttribute(LAYOUT_ATTRIBUTE) === 'compact' ? 'compact' : 'wide';
}

function subscribeToLayoutMode(onLayoutModeChange: () => void): () => void {
  const attributeObserver = new MutationObserver(onLayoutModeChange);
  attributeObserver.observe(document.documentElement, { attributes: true, attributeFilter: [LAYOUT_ATTRIBUTE] });
  return () => attributeObserver.disconnect();
}

export function useLayoutMode(): LayoutMode {
  return useSyncExternalStore(subscribeToLayoutMode, layoutModeOfDocument);
}
