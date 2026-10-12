import type { Claim } from './Claim';

/** A synthetic claim for specs; override the fields a case is about. */
export function syntheticClaim(overrides: Partial<Claim>): Claim {
  return {
    id:            'S-2099-0001',
    title:         'Example claim',
    category:      'home',
    policyId:      'EX-POLICY-1',
    reportedAt:    '2099-01-02T03:04',
    status:        'paidOut',
    handlerName:   null,
    incidentDate:  null,
    description:   null,
    photoDeadline: null,
    steps:         [{
      title: 'Example step', description: 'Example description', state: 'done', waitsForPhotos: false 
    }],
    ...overrides,
  };
}
