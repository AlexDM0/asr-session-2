import type { Claim, ClaimCreation } from '../../shared/model/Claim';
import type { Policy }               from '../../shared/model/Policy';
import type { LocalDateTime }        from '../../shared/model/Profile';

import { NEW_CLAIM_CONTENT } from './newClaimContent';

export interface NewClaimIdentity {
  readonly claimId:    string;
  readonly reportedAt: LocalDateTime;
  readonly policy:     Policy;
}

/** The claim stored for an accepted report: reported, no handler, four steps with the second current. */
export const NewClaimUtil = Object.freeze({
  claimFor(creation: ClaimCreation, { claimId, reportedAt, policy }: NewClaimIdentity): Claim {
    return {
      id:            claimId,
      title:         NEW_CLAIM_CONTENT.titles[creation.category],
      category:      creation.category,
      policyId:      policy.id,
      reportedAt,
      status:        'reported',
      handlerName:   null,
      incidentDate:  creation.incidentDate,
      description:   creation.description.trim(),
      photoDeadline: null,
      steps:         [
        {
          title: NEW_CLAIM_CONTENT.reportedStep.title, description: NEW_CLAIM_CONTENT.reportedStep.description(reportedAt), state: 'done', waitsForPhotos: false,
        },
        {
          title: NEW_CLAIM_CONTENT.receivedStep.title, description: NEW_CLAIM_CONTENT.receivedStep.description, state: 'current', waitsForPhotos: false,
        },
        {
          title: NEW_CLAIM_CONTENT.additionalInformationStep.title, description: NEW_CLAIM_CONTENT.additionalInformationStep.description, state: 'todo', waitsForPhotos: false,
        },
        {
          title: NEW_CLAIM_CONTENT.assessmentStep.title, description: NEW_CLAIM_CONTENT.assessmentStep.description, state: 'todo', waitsForPhotos: false,
        },
      ],
    };
  },
});
