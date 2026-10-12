import { useDesignSystemCopy } from './DesignSystemCopy';
import styles                  from './ErrorBanner.module.css';
import { Icon }                from './Icon';

export interface ErrorBannerProps {
  /** Regular variant only; the compact variant always shows the provider's compact message. */
  readonly message?:         string;
  readonly onRetry:          () => void;
  readonly variant?:         'regular' | 'compact';
  readonly isRetryDisabled?: boolean;
}

/** The one failure state of a data-backed view: announced when it appears, with a retry that repeats the read. */
export function ErrorBanner({
  message,
  onRetry,
  variant = 'regular',
  isRetryDisabled = false,
}: ErrorBannerProps) {
  const copy = useDesignSystemCopy();
  const isCompact = variant === 'compact';
  const shownMessage = isCompact ? copy.compactErrorMessage : message ?? copy.defaultErrorMessage;
  return (
    <div className={styles['errorBanner']} data-variant={variant} role="alert">
      {!isCompact && <Icon name="error" />}
      <p className={styles['message']}>{shownMessage}</p>
      <button className={styles['retry']} disabled={isRetryDisabled} onClick={onRetry} type="button">
        {copy.retryAction}
      </button>
    </div>
  );
}
