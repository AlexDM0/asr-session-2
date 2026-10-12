import {
  useCallback,
  useEffect,
  useState,
  type RefObject,
} from 'react';
import { useLocation } from 'react-router';

import type { LayoutMode } from '../../lib/layout-mode/LayoutMode';

export interface CompactMenuDisclosureOptions {
  readonly layoutMode:          LayoutMode;
  readonly headerReference:     RefObject<HTMLElement | null>;
  readonly menuButtonReference: RefObject<HTMLButtonElement | null>;
}

export interface CompactMenuDisclosure {
  readonly menuIsOpen: boolean;
  readonly toggleMenu: () => void;
}

/**
 * The open state of the non-modal compact menu: it belongs to the address it was opened at, so any navigation closes it
 * (also a later return to that address), and it never survives the wide layout mode.
 */
export function useCompactMenuDisclosure({ layoutMode, headerReference, menuButtonReference }: CompactMenuDisclosureOptions): CompactMenuDisclosure {
  const { key: locationKey } = useLocation();
  const [menuOpenedAtLocationKey, setMenuOpenedAtLocationKey] = useState<string | null>(null);
  if (menuOpenedAtLocationKey !== null && (layoutMode === 'wide' || menuOpenedAtLocationKey !== locationKey)) {
    setMenuOpenedAtLocationKey(null);
  }
  const menuIsOpen = layoutMode === 'compact' && menuOpenedAtLocationKey === locationKey;
  const closeMenu = useCallback(() => setMenuOpenedAtLocationKey(null), []);
  const toggleMenu = useCallback(() => {
    setMenuOpenedAtLocationKey((openedAtLocationKey) => (openedAtLocationKey === null ? locationKey : null));
  }, [locationKey]);

  useEffect(() => {
    const header = headerReference.current;
    if (!menuIsOpen || header === null) {
      return undefined;
    }
    const closeOnEscape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        closeMenu();
        menuButtonReference.current?.focus();
      }
    };
    const closeOnPointerDownOutsideHeader = (event: PointerEvent): void => {
      if (!(event.target instanceof Node) || !header.contains(event.target)) {
        closeMenu();
      }
    };
    // Focus moving to nothing (a press on a non-focusable spot) is left to the pointer rule, so a press inside the panel keeps it open.
    const closeOnFocusLeavingHeader = (event: FocusEvent): void => {
      if (event.relatedTarget instanceof Node && !header.contains(event.relatedTarget)) {
        closeMenu();
      }
    };
    document.addEventListener('keydown', closeOnEscape);
    document.addEventListener('pointerdown', closeOnPointerDownOutsideHeader);
    header.addEventListener('focusout', closeOnFocusLeavingHeader);
    return () => {
      document.removeEventListener('keydown', closeOnEscape);
      document.removeEventListener('pointerdown', closeOnPointerDownOutsideHeader);
      header.removeEventListener('focusout', closeOnFocusLeavingHeader);
    };
  }, [menuIsOpen, closeMenu, headerReference, menuButtonReference]);

  return { menuIsOpen, toggleMenu };
}
