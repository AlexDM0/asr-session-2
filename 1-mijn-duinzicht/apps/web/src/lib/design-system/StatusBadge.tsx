import styles from './StatusBadge.module.css';

export type StatusBadgeTone = 'ok' | 'warn' | 'err' | 'info' | 'neutral';

export interface StatusBadgeProps {
  readonly tone:  StatusBadgeTone;
  readonly label: string;
}

export function StatusBadge({ tone, label }: StatusBadgeProps) {
  return (
    <span className={styles['statusBadge']} data-tone={tone}>
      {label}
    </span>
  );
}
