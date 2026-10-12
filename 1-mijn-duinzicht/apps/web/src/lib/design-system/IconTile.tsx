import { Link } from 'react-router';

import { Icon }       from './Icon';
import { IconCircle } from './IconCircle';
import styles         from './IconTile.module.css';

export interface IconTileProps {
  readonly to:          string;
  readonly icon:        string;
  readonly title:       string;
  readonly hasChevron?: boolean;
}

export function IconTile({
  to,
  icon,
  title,
  hasChevron = true,
}: IconTileProps) {
  return (
    <Link className={styles['iconTile']} to={to}>
      <IconCircle icon={icon} size="medium" />
      <span className={styles['title']}>{title}</span>
      {hasChevron ? <Icon name="chevron_right" size="medium" /> : null}
    </Link>
  );
}
