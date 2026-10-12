import { DutchFormat } from '@mijn-duinzicht/dutch-format/DutchFormat';
import { Link }        from 'react-router';

import { ErrorBanner }        from '../../lib/design-system/ErrorBanner';
import { LoadingRegion }      from '../../lib/design-system/LoadingRegion';
import { SkeletonBlock }      from '../../lib/design-system/SkeletonBlock';
import type { ResourceState } from '../../lib/resource/useResource';
import type { Profile }       from '../../shared/model/Profile';
import { PortalPath }         from '../../shared/sections/PortalPath';

import styles         from './AvatarBlock.module.css';
import { SHELL_COPY } from './shellCopy';

export interface AvatarBlockProps {
  readonly profileState: ResourceState<Profile>;
  readonly onRetry:      () => void;
}

/** The customer's initials, name and number, linking to the profile; a skeleton while the profile loads and the compact error banner when it fails. */
export function AvatarBlock({ profileState, onRetry }: AvatarBlockProps) {
  if (profileState.status === 'loading') {
    return (
      <LoadingRegion>
        <span className={styles['avatarBlock']}>
          <SkeletonBlock height="var(--avatar-size)" shape="round" width="var(--avatar-size)" />
          <span className={styles['skeletonLines']}>
            <SkeletonBlock height="var(--font-size-medium)" width="var(--avatar-name-skeleton-width)" />
            <SkeletonBlock height="var(--font-size-caption)" width="var(--avatar-number-skeleton-width)" />
          </span>
        </span>
      </LoadingRegion>
    );
  }
  if (profileState.status !== 'loaded') {
    return <ErrorBanner onRetry={onRetry} variant="compact" />;
  }
  const profile = profileState.value;
  return (
    <Link className={styles['avatarBlock']} to={PortalPath.profile()}>
      <span aria-hidden="true" className={styles['initials']}>{profile.initials}</span>
      <span className={styles['identity']}>
        <span className={styles['fullName']}>{profile.fullName}</span>
        {' '}
        <span className={styles['customerNumber']}>{SHELL_COPY.customerNumberPrefix + DutchFormat.customerNumber(profile.customerNumber)}</span>
      </span>
    </Link>
  );
}
