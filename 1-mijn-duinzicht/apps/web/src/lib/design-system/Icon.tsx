import styles from './Icon.module.css';

export type IconSize = 'small' | 'medium' | 'default' | 'large' | 'extraLarge';

export interface IconProps {
  readonly name:  string;
  readonly size?: IconSize;
}

/** A Material Symbols ligature; always decorative, so an icon-only control carries its own label. */
export function Icon({ name, size = 'default' }: IconProps) {
  return (
    <span aria-hidden="true" className={styles['icon']} data-size={size}>
      {name}
    </span>
  );
}
