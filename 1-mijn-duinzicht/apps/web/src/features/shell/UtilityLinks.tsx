import { Link } from 'react-router';

import { Icon }       from '../../lib/design-system/Icon';
import { PortalPath } from '../../shared/sections/PortalPath';

import { InertLink }  from './InertLink';
import styles         from './UtilityLinks.module.css';
import { SHELL_COPY } from './shellCopy';

export interface UtilityLinksProps {
  readonly layout?: 'bar' | 'panel';
}

export function UtilityLinks({ layout = 'bar' }: UtilityLinksProps) {
  return (
    <nav aria-label={SHELL_COPY.utilityNavigationName} className={styles['utilityLinks']} data-layout={layout}>
      <InertLink>{SHELL_COPY.helpAndContact}</InertLink>
      <Link to={PortalPath.claims()}>{SHELL_COPY.reportClaim}</Link>
      <InertLink>
        <Icon name="logout" size="small" />
        {SHELL_COPY.logOut}
      </InertLink>
    </nav>
  );
}
