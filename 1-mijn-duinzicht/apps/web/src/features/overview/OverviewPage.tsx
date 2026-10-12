import { OverviewHero }        from './OverviewHero';
import { HERO_SOURCE_LOADERS } from './heroSourceLoaders';

export function OverviewPage() {
  return <OverviewHero sourceLoaders={HERO_SOURCE_LOADERS} />;
}
