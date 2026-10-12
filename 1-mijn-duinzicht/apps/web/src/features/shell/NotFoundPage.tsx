import { ButtonLink }    from '../../lib/design-system/ButtonLink';
import { ContentCard }   from '../../lib/design-system/ContentCard';
import { ContentColumn } from '../../lib/design-system/ContentColumn';
import { PortalPath }    from '../../shared/sections/PortalPath';

import styles         from './NotFoundPage.module.css';
import { SHELL_COPY } from './shellCopy';

/** Shown inside the shell for every address outside the portal's routes. */
export function NotFoundPage() {
  return (
    <div className={styles['notFoundPage']}>
      <ContentColumn>
        <ContentCard isReadableWidth padding="space40">
          <div className={styles['content']}>
            <h1 className={styles['heading']}>{SHELL_COPY.notFoundHeading}</h1>
            <p className={styles['lead']}>{SHELL_COPY.notFoundLead}</p>
            <ButtonLink to={PortalPath.overview()} variant="secondary">{SHELL_COPY.notFoundButton}</ButtonLink>
          </div>
        </ContentCard>
      </ContentColumn>
    </div>
  );
}
