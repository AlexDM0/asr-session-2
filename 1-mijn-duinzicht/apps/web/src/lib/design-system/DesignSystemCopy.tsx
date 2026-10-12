import { createContext, use, type ReactNode } from 'react';

/** The few fixed texts the parts need; the application supplies them once, so the design system words nothing itself. */
export interface DesignSystemCopy {
  readonly loadingAnnouncement:      string;
  readonly retryAction:              string;
  readonly defaultErrorMessage:      string;
  readonly compactErrorMessage:      string;
  readonly breadcrumbNavigationName: string;
  readonly timelineStateLabels:      Readonly<Record<'done' | 'current' | 'todo', string>>;
  readonly progressStepsText:        (doneCount: number, totalCount: number) => string;
}

const DesignSystemCopyContext = createContext<DesignSystemCopy | null>(null);

export function DesignSystemCopyProvider({ copy, children }: { readonly copy: DesignSystemCopy; readonly children: ReactNode }) {
  return <DesignSystemCopyContext value={copy}>{children}</DesignSystemCopyContext>;
}

export function useDesignSystemCopy(): DesignSystemCopy {
  const copy = use(DesignSystemCopyContext);
  if (copy === null) {
    throw new Error('A design-system part was rendered outside DesignSystemCopyProvider, so it has no copy to show.');
  }
  return copy;
}
