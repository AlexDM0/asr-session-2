/**
 * Every link between sections is built here, so what matters is that each builder produces exactly
 * the Dutch route the router declares.
 */
import { describe, expect, it } from 'bun:test';

import { PortalPath } from './PortalPath';

describe('PortalPath', () => {
  it('builds the section routes in Dutch', () => {
    expect(PortalPath.overview()).toBe('/');
    expect(PortalPath.policies()).toBe('/polissen');
    expect(PortalPath.claims()).toBe('/schade');
    expect(PortalPath.profile()).toBe('/profiel');
    expect(PortalPath.messages()).toBe('/berichten');
  });
});
