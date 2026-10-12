import { Breadcrumb, type BreadcrumbItem } from '../../lib/design-system/Breadcrumb';
import { ContentColumn }                   from '../../lib/design-system/ContentColumn';

import styles               from './PlaceholderPage.module.css';
import { PLACEHOLDER_COPY } from './placeholderCopy';

export interface PlaceholderPageProps {
  readonly heading:          string;
  readonly breadcrumbItems?: readonly BreadcrumbItem[];
}

/** Stands in for a section until its own feature replaces the page; it requests no data. */
export function PlaceholderPage({ heading, breadcrumbItems }: PlaceholderPageProps) {
  return (
    <div className={styles['placeholderPage']}>
      <ContentColumn>
        <div className={styles['content']}>
          <div className={styles['headingGroup']}>
            {breadcrumbItems !== undefined && <Breadcrumb items={breadcrumbItems} />}
            <h1 className={styles['heading']}>{heading}</h1>
          </div>
          <p className={styles['line']}>{PLACEHOLDER_COPY.underConstructionLine}</p>
        </div>
      </ContentColumn>
    </div>
  );
}
