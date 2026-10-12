import './lib/design-system/tokens.css';
import './lib/design-system/global.css';

import { createRoot }          from 'react-dom/client';
import { createBrowserRouter } from 'react-router';
import { RouterProvider }      from 'react-router/dom';

import { DesignSystemCopyProvider }  from './lib/design-system/DesignSystemCopy';
import { startLayoutModeTracking }   from './lib/layout-mode/LayoutMode';
import { PORTAL_ROUTES }             from './portalRoutes';
import { PORTAL_DESIGN_SYSTEM_COPY } from './shared/copy/portalDesignSystemCopy';

const BREAKPOINT_TOKEN = '--breakpoint';
const ROOT_ELEMENT_ID = 'root';
const PIXEL_LENGTH_PATTERN = /^(\d+)px$/;

function breakpointPixelsOfDocument(): number | undefined {
  const breakpointValue = getComputedStyle(document.documentElement).getPropertyValue(BREAKPOINT_TOKEN).trim();
  const pixelMatch = PIXEL_LENGTH_PATTERN.exec(breakpointValue);
  return pixelMatch?.[1] === undefined ? undefined : Number(pixelMatch[1]);
}

function startPortal(): void {
  const breakpointPixels = breakpointPixelsOfDocument();
  if (breakpointPixels === undefined) {
    throw new Error(`The portal cannot start: ${BREAKPOINT_TOKEN} is not a pixel length on the root element; is tokens.css loaded?`);
  }
  const rootElement = document.getElementById(ROOT_ELEMENT_ID);
  if (rootElement === null) {
    throw new Error(`The portal cannot start: index.html has no element with the id "${ROOT_ELEMENT_ID}".`);
  }
  startLayoutModeTracking({ window, breakpointPixels });
  createRoot(rootElement).render(
    <DesignSystemCopyProvider copy={PORTAL_DESIGN_SYSTEM_COPY}>
      <RouterProvider router={createBrowserRouter(PORTAL_ROUTES)} />
    </DesignSystemCopyProvider>,
  );
}

startPortal();
