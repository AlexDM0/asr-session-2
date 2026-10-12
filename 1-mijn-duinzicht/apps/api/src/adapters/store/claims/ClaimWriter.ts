import type { Database } from 'bun:sqlite';

import { PortalError }            from '../../../shared/errors/PortalError';
import type { Claim, ClaimPhoto } from '../../../shared/model/Claim';

type StatementBindings = Record<string, string | number | null>;

export interface ClaimWriter {
  insertClaim(customerNumber: string, claim: Claim): void;
  /** Stores the steps and deadline of a claim after a photo receipt and one row per photo, in the caller's transaction. */
  recordPhotoReceipt(claimAfterReceipt: Claim, photos: readonly ClaimPhoto[]): void;
  /** Stores a newly reported claim with its steps for the store's one customer, in the caller's transaction. */
  insertReportedClaim(claim: Claim): void;
}

export function createClaimWriter(connection: Database): ClaimWriter {
  function insertClaim(customerNumber: string, claim: Claim): void {
    connection.query<never, StatementBindings>(
      `INSERT INTO claim (
        claim_id, customer_number, policy_id, title, category, reported_at, status, handler_name, incident_date, description, photo_deadline
      ) VALUES (
        $claimId, $customerNumber, $policyId, $title, $category, $reportedAt, $status, $handlerName, $incidentDate, $description, $photoDeadline
      )`,
    ).run({
      claimId:       claim.id,
      customerNumber,
      policyId:      claim.policyId,
      title:         claim.title,
      category:      claim.category,
      reportedAt:    claim.reportedAt,
      status:        claim.status,
      handlerName:   claim.handlerName,
      incidentDate:  claim.incidentDate,
      description:   claim.description,
      photoDeadline: claim.photoDeadline,
    });
    const insertStep = connection.query<never, StatementBindings>(
      `INSERT INTO claim_step (claim_id, position, title, description, state, waits_for_photos)
       VALUES ($claimId, $position, $title, $description, $state, $waitsForPhotos)`,
    );
    claim.steps.forEach((step, index) => {
      insertStep.run({
        claimId:        claim.id,
        position:       index + 1,
        title:          step.title,
        description:    step.description,
        state:          step.state,
        waitsForPhotos: step.waitsForPhotos ? 1 : 0,
      });
    });
  }

  return {
    insertClaim,

    insertReportedClaim(claim) {
      const customer = connection.query<{ customer_number: string }, []>('SELECT customer_number FROM customer').get();
      if (customer === null) {
        throw new PortalError('unrepaired', 'invalidStoredValue', 'The store holds no customer to report a claim for.');
      }
      insertClaim(customer.customer_number, claim);
    },

    recordPhotoReceipt(claimAfterReceipt, photos) {
      const updateStep = connection.query<never, StatementBindings>(
        `UPDATE claim_step SET state = $state, description = $description, waits_for_photos = $waitsForPhotos
         WHERE claim_id = $claimId AND position = $position`,
      );
      claimAfterReceipt.steps.forEach((step, index) => {
        updateStep.run({
          claimId:        claimAfterReceipt.id,
          position:       index + 1,
          description:    step.description,
          state:          step.state,
          waitsForPhotos: step.waitsForPhotos ? 1 : 0,
        });
      });
      connection.query<never, StatementBindings>('UPDATE claim SET photo_deadline = $photoDeadline WHERE claim_id = $claimId').run({
        claimId:       claimAfterReceipt.id,
        photoDeadline: claimAfterReceipt.photoDeadline,
      });
      const insertPhoto = connection.query<never, StatementBindings>(
        `INSERT INTO claim_photo (photo_id, claim_id, original_file_name, media_type, size_bytes, stored_file_name, uploaded_at)
         VALUES ($photoId, $claimId, $originalFileName, $mediaType, $sizeBytes, $storedFileName, $uploadedAt)`,
      );
      for (const photo of photos) {
        insertPhoto.run({
          photoId:          photo.photoId,
          claimId:          photo.claimId,
          originalFileName: photo.originalFileName,
          mediaType:        photo.mediaType,
          sizeBytes:        photo.sizeBytes,
          storedFileName:   photo.storedFileName,
          uploadedAt:       photo.uploadedAt,
        });
      }
    },
  };
}
