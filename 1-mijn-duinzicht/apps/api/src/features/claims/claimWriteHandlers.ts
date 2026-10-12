import type { FieldErrorWire }  from '@mijn-duinzicht/api-contract/ApiErrorWire';
import type { ClaimDetailWire } from '@mijn-duinzicht/api-contract/ClaimWire';
import type { Database }        from 'bun:sqlite';

import { ApiErrorResponse }                         from '../../adapters/http/ApiErrorResponse';
import { ClaimPhotoUploadUtil, type PhotoFormData } from '../../adapters/http/ClaimPhotoUploadUtil';
import { CLAIM_CREATION_FIELDS, ClaimWireUtil }     from '../../adapters/http/ClaimWireUtil';
import { jsonRequestBodyVerdictFor }                from '../../adapters/http/JsonRequestBody';
import { foundValueOf }                             from '../../adapters/store/IngestionVerdict';
import { ClaimIngestion }                           from '../../adapters/store/claims/ClaimIngestion';
import { createClaimPhotoFileWriter }               from '../../adapters/store/claims/ClaimPhotoFileWriter';
import { createClaimWriter }                        from '../../adapters/store/claims/ClaimWriter';
import { PolicyIngestion }                          from '../../adapters/store/policies/PolicyIngestion';
import type { ApiContext }                          from '../../services/ApiContext';
import { PortalError }                              from '../../shared/errors/PortalError';
import { type Claim, claimAwaitsCustomerPhotos }    from '../../shared/model/Claim';

import { AmsterdamClockUtil }       from './AmsterdamClockUtil';
import { ClaimCreationVerdictUtil } from './ClaimCreationVerdictUtil';
import { ClaimNumberUtil }          from './ClaimNumberUtil';
import { ClaimPhotoReceiptUtil }    from './ClaimPhotoReceiptUtil';
import { NewClaimUtil }             from './NewClaimUtil';
import { withPolicyNames }          from './claimHandlers';

function claimDetailWireFor(connection: Database, claim: Claim): ClaimDetailWire {
  const policies = foundValueOf(new PolicyIngestion(connection).readPolicies(), 'policies') ?? [];
  return ClaimWireUtil.claimDetailWireFor({ claim, policyName: withPolicyNames([claim], policies)[0]?.policyName ?? '' });
}

const MULTIPART_MEDIA_TYPE = 'multipart/form-data';

type StoredReportVerdict =
  | { readonly outcome: 'stored'; readonly claimDetail: ClaimDetailWire }
  | { readonly outcome: 'refused'; readonly fieldErrors: readonly FieldErrorWire[] }
  | { readonly outcome: 'exhausted' };

const FIELD_ERROR_ORDER: readonly string[] = CLAIM_CREATION_FIELDS;

function inFieldOrder(fieldErrors: readonly FieldErrorWire[]): FieldErrorWire[] {
  const positionOf = (fieldError: FieldErrorWire) => {
    const position = FIELD_ERROR_ORDER.indexOf(fieldError.field);
    return position === -1 ? FIELD_ERROR_ORDER.length : position;
  };
  return fieldErrors.toSorted((a, b) => positionOf(a) - positionOf(b));
}

type StoredReceiptVerdict =
  | { readonly outcome: 'stored'; readonly claimDetail: ClaimDetailWire }
  | { readonly outcome: 'photosNotExpected' };

function mediaTypeOf(request: Request): string {
  return (request.headers.get('content-type') ?? '').split(';')[0]?.trim().toLowerCase() ?? '';
}

async function formDataOf(request: Request): Promise<PhotoFormData | undefined> {
  if (mediaTypeOf(request) !== MULTIPART_MEDIA_TYPE) {
    return undefined;
  }
  try {
    return await request.formData();
  } catch {
    return undefined;
  }
}

function photosNotExpected(claimId: string): Response {
  return ApiErrorResponse.responseFor('photosNotExpected', `Claim ${claimId} does not wait for photos.`);
}

export function createClaimWriteHandlers(context: ApiContext) {
  const photoFileWriter = createClaimPhotoFileWriter({ uploadDirectory: context.uploadDirectory });

  return {
    /** POST /api/claims: 400 for a body that is not a JSON object, then 422 with every field error, then 409 when the year's sequence is used up. */
    async reportClaim(request: Request): Promise<Response> {
      const bodyVerdict = await jsonRequestBodyVerdictFor(request);
      if (bodyVerdict.outcome === 'malformed') {
        return ApiErrorResponse.responseFor('malformedRequest', 'The request body must be a JSON object sent as application/json.');
      }
      const wireVerdict = ClaimWireUtil.claimCreationFrom(bodyVerdict.body);
      // The incident-date check and the report year's id sequence both depend on the clock, so it is read once here.
      const now = new Date();
      const today = AmsterdamClockUtil.localDateAt(now);
      const reportedAt = AmsterdamClockUtil.localDateTimeAt(now);
      const storedVerdict = context.store.write((connection): StoredReportVerdict => {
        const policies = foundValueOf(new PolicyIngestion(connection).readPolicies(), 'policies') ?? [];
        const readFields = wireVerdict.outcome === 'read' ? wireVerdict.creation : wireVerdict.readFields;
        const ruleVerdict = ClaimCreationVerdictUtil.verdictFor(readFields, { policies, today });
        const fieldErrors = [
          ...(wireVerdict.outcome === 'invalid' ? wireVerdict.fieldErrors : []),
          ...(ruleVerdict.outcome === 'refused' ? ruleVerdict.fieldErrors : []),
        ];
        const policy = policies.find((candidate) => candidate.id === readFields.policyId);
        if (fieldErrors.length > 0 || wireVerdict.outcome === 'invalid' || policy === undefined) {
          return { outcome: 'refused', fieldErrors: inFieldOrder(fieldErrors) };
        }
        const existingClaimIds = (foundValueOf(new ClaimIngestion(connection).readClaims(), 'claims') ?? []).map((claim) => claim.id);
        const numberVerdict = ClaimNumberUtil.nextClaimIdFor(existingClaimIds, reportedAt.slice(0, 4));
        if (numberVerdict.outcome === 'exhausted') {
          return numberVerdict;
        }
        createClaimWriter(connection).insertReportedClaim(NewClaimUtil.claimFor(wireVerdict.creation, { claimId: numberVerdict.claimId, reportedAt, policy }));
        const storedClaim = foundValueOf(new ClaimIngestion(connection).readClaim(numberVerdict.claimId), 'claim');
        if (storedClaim === undefined) {
          throw new PortalError('unrepaired', 'invalidStoredValue', `Claim ${numberVerdict.claimId} was not stored.`);
        }
        return { outcome: 'stored', claimDetail: claimDetailWireFor(connection, storedClaim) };
      });
      switch (storedVerdict.outcome) {
        case 'refused':
          return ApiErrorResponse.responseFor('validationFailed', 'The claim report is not valid.', storedVerdict.fieldErrors);
        case 'exhausted':
          return ApiErrorResponse.responseFor('claimSequenceExhausted', 'No claim id is left for this report year.');
        case 'stored':
          return Response.json(storedVerdict.claimDetail, { status: 201, headers: { Location: `/api/claims/${storedVerdict.claimDetail.id}` } });
      }
    },

    /**
     * POST /api/claims/:claimId/photos: refusals in the order 404, 400, 409, 422, 415, 413; files are written before the store
     * transaction and removed on any failure.
     */
    async receiveClaimPhotos(claimId: string, request: Request): Promise<Response> {
      const storedClaim = context.store.read((connection) => foundValueOf(new ClaimIngestion(connection).readClaim(claimId), 'claim'));
      if (storedClaim === undefined) {
        return ApiErrorResponse.responseFor('notFound', `No claim with id ${claimId}.`);
      }
      const formData = await formDataOf(request);
      const uploadVerdict = formData === undefined ? { outcome: 'malformed' } as const : await ClaimPhotoUploadUtil.photosFrom(formData);
      if (uploadVerdict.outcome === 'malformed') {
        return ApiErrorResponse.responseFor('malformedRequest', 'The request must be multipart/form-data with only file parts named photos.');
      }
      if (!claimAwaitsCustomerPhotos(storedClaim)) {
        return photosNotExpected(claimId);
      }
      switch (uploadVerdict.outcome) {
        case 'countOutOfRange':
          return ApiErrorResponse.responseFor('photoCountOutOfRange', 'Send between 1 and 10 photos.');
        case 'unsupportedType':
          return ApiErrorResponse.responseFor('unsupportedPhotoType', 'Every photo must be a JPEG, PNG or HEIC image.');
        case 'tooLarge':
          return ApiErrorResponse.responseFor('photoTooLarge', 'Every photo must be at most 10 485 760 bytes.');
        case 'read':
          break;
      }
      const { photos } = uploadVerdict;
      let storedFileNames: string[] = [];
      try {
        const storedFiles = await photoFileWriter.writePhotos(photos);
        storedFileNames = storedFiles.map((storedFile) => storedFile.storedFileName);
        const uploadedAt = AmsterdamClockUtil.localDateTimeWithSecondsAt(new Date());
        const storedVerdict = context.store.write((connection): StoredReceiptVerdict => {
          const claim = foundValueOf(new ClaimIngestion(connection).readClaim(claimId), 'claim');
          const receiptVerdict = claim === undefined ? { outcome: 'photosNotExpected' } as const : ClaimPhotoReceiptUtil.claimAfterPhotoReceipt(claim, photos.length);
          if (receiptVerdict.outcome === 'photosNotExpected') {
            return receiptVerdict;
          }
          createClaimWriter(connection).recordPhotoReceipt(receiptVerdict.claim, photos.map((photo, index) => ({
            photoId:          storedFiles[index]?.photoId ?? '',
            claimId,
            originalFileName: photo.originalFileName,
            mediaType:        photo.mediaType,
            sizeBytes:        photo.sizeBytes,
            storedFileName:   storedFiles[index]?.storedFileName ?? '',
            uploadedAt,
          })));
          const claimAfterReceipt = foundValueOf(new ClaimIngestion(connection).readClaim(claimId), 'claim') ?? receiptVerdict.claim;
          return { outcome: 'stored', claimDetail: claimDetailWireFor(connection, claimAfterReceipt) };
        });
        if (storedVerdict.outcome === 'photosNotExpected') {
          await photoFileWriter.removePhotos(storedFileNames);
          return photosNotExpected(claimId);
        }
        return Response.json(storedVerdict.claimDetail);
      } catch (error) {
        await photoFileWriter.removePhotos(storedFileNames);
        if (error instanceof PortalError) {
          return ApiErrorResponse.responseForPortalError(error);
        }
        context.log({ kind: 'requestFailed', errorMessage: error instanceof Error ? error.message : String(error) });
        return ApiErrorResponse.responseFor('internalError', 'The photos could not be stored.');
      }
    },
  };
}
