import type { CSSProperties } from 'react';

import styles from './SkeletonBlock.module.css';

export type SkeletonShape = 'block' | 'round' | 'pill';

export interface SkeletonBlockProps {
  /** A token reference or percentage, such as `var(--avatar-size)`, never a literal length. */
  readonly width:  string;
  readonly height: string;
  readonly shape?: SkeletonShape;
}

type SkeletonSizeProperties = CSSProperties & Readonly<Record<'--skeleton-width' | '--skeleton-height', string>>;

/** A static grey stand-in for content that is still loading; the surrounding `LoadingRegion` announces it. */
export function SkeletonBlock({ width, height, shape = 'block' }: SkeletonBlockProps) {
  const sizeProperties: SkeletonSizeProperties = { '--skeleton-width': width, '--skeleton-height': height };
  return <span aria-hidden="true" className={styles['skeletonBlock']} data-shape={shape} style={sizeProperties} />;
}
