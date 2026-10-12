import type { Ref } from 'react';

import { Icon } from '../../lib/design-system/Icon';

import styles         from './CompactHeaderBar.module.css';
import { Wordmark }   from './Wordmark';
import { SHELL_COPY } from './shellCopy';

export interface CompactHeaderBarProps {
  readonly menuIsOpen:          boolean;
  readonly menuPanelId:         string;
  readonly onMenuToggle:        () => void;
  readonly menuButtonReference: Ref<HTMLButtonElement>;
}

/** The one 64px bar below the breakpoint: the wordmark and the button that opens and closes the menu panel. */
export function CompactHeaderBar({
  menuIsOpen,
  menuPanelId,
  onMenuToggle,
  menuButtonReference,
}: CompactHeaderBarProps) {
  return (
    <div className={styles['compactHeaderBar']}>
      <Wordmark />
      <button
        aria-controls={menuPanelId}
        aria-expanded={menuIsOpen}
        aria-label={menuIsOpen ? SHELL_COPY.closeMenu : SHELL_COPY.openMenu}
        className={styles['menuButton']}
        onClick={onMenuToggle}
        ref={menuButtonReference}
        type="button"
      >
        <Icon name={menuIsOpen ? 'close' : 'menu'} size="large" />
      </button>
    </div>
  );
}
