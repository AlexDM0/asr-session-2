import { Icon, type IconSize } from './Icon';
import styles                  from './IconCircle.module.css';

export type IconCircleSize = 'small' | 'medium' | 'large';

export type IconCircleTone = 'sage' | 'cream';

export interface IconCircleProps {
  readonly icon:  string;
  readonly size:  IconCircleSize;
  readonly tone?: IconCircleTone;
}

const ICON_SIZE_BY_CIRCLE_SIZE: Readonly<Record<IconCircleSize, IconSize>> = {
  small:  'default',
  medium: 'large',
  large:  'extraLarge',
};

export function IconCircle({ icon, size, tone = 'sage' }: IconCircleProps) {
  return (
    <span aria-hidden="true" className={styles['iconCircle']} data-size={size} data-tone={tone}>
      <Icon name={icon} size={ICON_SIZE_BY_CIRCLE_SIZE[size]} />
    </span>
  );
}
