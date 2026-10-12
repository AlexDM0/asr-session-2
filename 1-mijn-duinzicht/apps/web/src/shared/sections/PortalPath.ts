/** The shell's sections; `notFound` is the section of every address outside the portal's routes, where no navigation item is active. */
export type PortalSection = 'overview' | 'policies' | 'claims' | 'profile' | 'messages' | 'notFound';

/** Builds the Dutch browser routes, so no part of the portal spells a route by hand. */
export const PortalPath = {
  overview: (): string => '/',
  policies: (): string => '/polissen',
  claims:   (): string => '/schade',
  profile:  (): string => '/profiel',
  messages: (): string => '/berichten',
} as const;
