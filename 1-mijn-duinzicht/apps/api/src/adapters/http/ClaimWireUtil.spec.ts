/**
 * The wire util pins the claim list and detail answers: absent optional values are sent as `null`, the
 * list carries the step states in order and the photo-wait flag, and the detail drops `stepStates`.
 */
import { describe, expect, it } from 'bun:test';

import type { Claim } from '../../shared/model/Claim';

import { ClaimWireUtil } from './ClaimWireUtil';

const EXAMPLE_CLAIM: Claim = {
  id:            'S-2099-0001',
  title:         'Example claim',
  category:      'car',
  policyId:      'EX-POLICY-1',
  reportedAt:    '2099-01-02T03:04',
  status:        'reported',
  handlerName:   null,
  incidentDate:  null,
  description:   null,
  photoDeadline: '2099-01-10',
  steps:         [
    {
      title: 'Example step 1', description: 'Example done', state: 'done', waitsForPhotos: false 
    },
    {
      title: 'Example step 2', description: 'Example waiting', state: 'current', waitsForPhotos: true 
    },
  ],
};

describe('ClaimWireUtil', () => {
  it('maps a claim to the summary fields with its policy name, step states and photo-wait flag', () => {
    expect(ClaimWireUtil.claimSummaryWireFor({ claim: EXAMPLE_CLAIM, policyName: 'Example policy' })).toStrictEqual({
      id:                   'S-2099-0001',
      title:                'Example claim',
      category:             'car',
      policyId:             'EX-POLICY-1',
      policyName:           'Example policy',
      reportedAt:           '2099-01-02T03:04',
      status:               'reported',
      handlerName:          null,
      stepStates:           ['done', 'current'],
      awaitsCustomerPhotos: true,
    });
  });

  it('maps a claim to the detail fields, sending absent values as null and never omitting them', () => {
    const detail = ClaimWireUtil.claimDetailWireFor({ claim: EXAMPLE_CLAIM, policyName: 'Example policy' });

    expect(detail).toStrictEqual({
      id:                   'S-2099-0001',
      title:                'Example claim',
      category:             'car',
      policyId:             'EX-POLICY-1',
      policyName:           'Example policy',
      reportedAt:           '2099-01-02T03:04',
      status:               'reported',
      handlerName:          null,
      awaitsCustomerPhotos: true,
      incidentDate:         null,
      description:          null,
      photoDeadline:        '2099-01-10',
      steps:                [
        {
          title: 'Example step 1', description: 'Example done', state: 'done', waitsForPhotos: false 
        },
        {
          title: 'Example step 2', description: 'Example waiting', state: 'current', waitsForPhotos: true 
        },
      ],
    });
    expect(Object.hasOwn(detail, 'stepStates')).toBe(false);
    expect(JSON.parse(JSON.stringify(detail))).toHaveProperty('incidentDate', null);
  });

  it('wraps the summaries in a claims list in the given order', () => {
    const otherClaim = { ...EXAMPLE_CLAIM, id: 'S-2099-0000' };

    const list = ClaimWireUtil.claimListWireFor([{ claim: EXAMPLE_CLAIM, policyName: 'Example policy' }, { claim: otherClaim, policyName: 'Example policy' }]);

    expect(list.claims.map((claim) => claim.id)).toEqual(['S-2099-0001', 'S-2099-0000']);
  });
});

const COMPLETE_CREATION_BODY = {
  category: 'car', policyId: 'DZ-EX-000001', incidentDate: '2099-01-01', description: 'Example claim description.',
} as const;

function fieldErrorsFor(body: Readonly<Record<string, unknown>>): unknown {
  const verdict = ClaimWireUtil.claimCreationFrom(body);
  return verdict.outcome === 'invalid' ? verdict.fieldErrors : [];
}

describe('ClaimWireUtil.claimCreationFrom', () => {
  it('reads a complete body into a claim creation', () => {
    expect(ClaimWireUtil.claimCreationFrom(COMPLETE_CREATION_BODY)).toStrictEqual({ outcome: 'read', creation: COMPLETE_CREATION_BODY });
  });

  it('refuses an absent or null category as required and an unknown or non-string category as invalidFormat', () => {
    const { category: _category, ...withoutCategory } = COMPLETE_CREATION_BODY;
    expect(fieldErrorsFor(withoutCategory)).toStrictEqual([{ field: 'category', reason: 'required' }]);
    expect(fieldErrorsFor({ ...COMPLETE_CREATION_BODY, category: null })).toStrictEqual([{ field: 'category', reason: 'required' }]);
    expect(fieldErrorsFor({ ...COMPLETE_CREATION_BODY, category: 'boat' })).toStrictEqual([{ field: 'category', reason: 'invalidFormat' }]);
    expect(fieldErrorsFor({ ...COMPLETE_CREATION_BODY, category: 1 })).toStrictEqual([{ field: 'category', reason: 'invalidFormat' }]);
  });

  it('refuses an absent, null or empty policy id as required', () => {
    const { policyId: _policyId, ...withoutPolicy } = COMPLETE_CREATION_BODY;
    expect(fieldErrorsFor(withoutPolicy)).toStrictEqual([{ field: 'policyId', reason: 'required' }]);
    expect(fieldErrorsFor({ ...COMPLETE_CREATION_BODY, policyId: null })).toStrictEqual([{ field: 'policyId', reason: 'required' }]);
    expect(fieldErrorsFor({ ...COMPLETE_CREATION_BODY, policyId: '' })).toStrictEqual([{ field: 'policyId', reason: 'required' }]);
  });

  it('refuses an absent incident date as required and a non-string one as invalidFormat', () => {
    const { incidentDate: _incidentDate, ...withoutDate } = COMPLETE_CREATION_BODY;
    expect(fieldErrorsFor(withoutDate)).toStrictEqual([{ field: 'incidentDate', reason: 'required' }]);
    expect(fieldErrorsFor({ ...COMPLETE_CREATION_BODY, incidentDate: 20990101 })).toStrictEqual([{ field: 'incidentDate', reason: 'invalidFormat' }]);
  });

  it('refuses an absent or null description as required and a non-string one as invalidFormat', () => {
    const { description: _description, ...withoutDescription } = COMPLETE_CREATION_BODY;
    expect(fieldErrorsFor(withoutDescription)).toStrictEqual([{ field: 'description', reason: 'required' }]);
    expect(fieldErrorsFor({ ...COMPLETE_CREATION_BODY, description: null })).toStrictEqual([{ field: 'description', reason: 'required' }]);
    expect(fieldErrorsFor({ ...COMPLETE_CREATION_BODY, description: ['text'] })).toStrictEqual([{ field: 'description', reason: 'invalidFormat' }]);
  });

  it('refuses any other key as unknownField', () => {
    expect(fieldErrorsFor({ ...COMPLETE_CREATION_BODY, status: 'reported' })).toStrictEqual([{ field: 'status', reason: 'unknownField' }]);
  });

  it('reports every field error together and keeps the fields it could read', () => {
    expect(ClaimWireUtil.claimCreationFrom({ category: 'boat', policyId: 'DZ-EX-000001', extra: true })).toStrictEqual({
      outcome:     'invalid',
      fieldErrors: [
        { field: 'category', reason: 'invalidFormat' },
        { field: 'incidentDate', reason: 'required' },
        { field: 'description', reason: 'required' },
        { field: 'extra', reason: 'unknownField' },
      ],
      readFields: { policyId: 'DZ-EX-000001' },
    });
  });
});
