import { Link } from 'react-router';

import styles                  from './Breadcrumb.module.css';
import { useDesignSystemCopy } from './DesignSystemCopy';

export interface BreadcrumbItem {
  readonly label: string;
  /** Every item but the last leads somewhere; the last is the current page. */
  readonly to?:   string;
}

export interface BreadcrumbProps {
  readonly items: readonly BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  const copy = useDesignSystemCopy();
  const lastIndex = items.length - 1;
  return (
    <nav aria-label={copy.breadcrumbNavigationName} className={styles['breadcrumb']}>
      <ol className={styles['list']}>
        {items.map((item, index) => (
          <li className={styles['item']} key={`${index}-${item.label}`}>
            {index > 0 && <span aria-hidden="true"> / </span>}
            {index === lastIndex || item.to === undefined
              ? <span aria-current={index === lastIndex ? 'page' : undefined}>{item.label}</span>
              : <Link className={styles['link']} to={item.to}>{item.label}</Link>}
          </li>
        ))}
      </ol>
    </nav>
  );
}
