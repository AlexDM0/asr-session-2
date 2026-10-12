/**
 * The layout mode is the only way the breakpoint reaches CSS and components, so what matters is the
 * edge (exactly the breakpoint is wide, one pixel less is compact), that the attribute follows a
 * viewport change, that stopping really stops, and that the hook reports the attribute's mode.
 */
import { renderHook, waitFor } from '@testing-library/react';
import {
  afterEach,
  describe,
  expect,
  it,
} from 'bun:test';

import { startLayoutModeTracking, useLayoutMode } from './LayoutMode';

const EXAMPLE_BREAKPOINT_PIXELS = 900;
const HAPPY_DOM_DEFAULT_WIDTH_PIXELS = 1024;

interface ViewportControl {
  setViewport(viewport: { width: number }): void;
}

function isViewportControl(candidate: unknown): candidate is ViewportControl {
  return typeof candidate === 'object' && candidate !== null && 'setViewport' in candidate && typeof candidate.setViewport === 'function';
}

function resizeViewportTo(widthPixels: number): void {
  const viewportControl: unknown = Reflect.get(window, 'happyDOM');
  if (!isViewportControl(viewportControl)) {
    throw new Error('The happy-dom viewport control is missing; is the happydom.ts preload registered?');
  }
  viewportControl.setViewport({ width: widthPixels });
}

function layoutAttribute(): string | null {
  return document.documentElement.getAttribute('data-layout');
}

const stopFunctions: (() => void)[] = [];

function startTracking(): () => void {
  const stopTracking = startLayoutModeTracking({ window, breakpointPixels: EXAMPLE_BREAKPOINT_PIXELS });
  stopFunctions.push(stopTracking);
  return stopTracking;
}

afterEach(() => {
  for (const stopTracking of stopFunctions.splice(0)) {
    stopTracking();
  }
  resizeViewportTo(HAPPY_DOM_DEFAULT_WIDTH_PIXELS);
  document.documentElement.removeAttribute('data-layout');
});

describe('startLayoutModeTracking', () => {
  it('writes data-layout="wide" on the root element at exactly the breakpoint width', () => {
    resizeViewportTo(EXAMPLE_BREAKPOINT_PIXELS);

    startTracking();

    expect(layoutAttribute()).toBe('wide');
  });

  it('writes data-layout="compact" one pixel below the breakpoint', () => {
    resizeViewportTo(EXAMPLE_BREAKPOINT_PIXELS - 1);

    startTracking();

    expect(layoutAttribute()).toBe('compact');
  });

  it('updates the attribute when the viewport crosses the breakpoint in either direction', () => {
    resizeViewportTo(EXAMPLE_BREAKPOINT_PIXELS);
    startTracking();

    resizeViewportTo(EXAMPLE_BREAKPOINT_PIXELS - 1);
    expect(layoutAttribute()).toBe('compact');

    resizeViewportTo(EXAMPLE_BREAKPOINT_PIXELS);
    expect(layoutAttribute()).toBe('wide');
  });

  it('stops updating the attribute once its stop function has run', () => {
    resizeViewportTo(EXAMPLE_BREAKPOINT_PIXELS);
    const stopTracking = startTracking();

    stopTracking();
    resizeViewportTo(EXAMPLE_BREAKPOINT_PIXELS - 1);

    expect(layoutAttribute()).toBe('wide');
  });
});

describe('useLayoutMode', () => {
  it('returns the current mode and follows a change of the attribute', async () => {
    resizeViewportTo(EXAMPLE_BREAKPOINT_PIXELS);
    startTracking();
    const { result } = renderHook(() => useLayoutMode());

    expect(result.current).toBe('wide');

    resizeViewportTo(EXAMPLE_BREAKPOINT_PIXELS - 1);

    await waitFor(() => expect(result.current).toBe('compact'));
  });
});
