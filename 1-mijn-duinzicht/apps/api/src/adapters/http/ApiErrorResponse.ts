import type { ApiErrorCode, ApiErrorWire, FieldErrorWire } from '@mijn-duinzicht/api-contract/ApiErrorWire';

import type { PortalError, PortalErrorReason } from '../../shared/errors/PortalError';

/** Every code the API answers itself; `apiUnreachable` is answered by the web dev server's proxy. */
export type ApiOwnErrorCode = Exclude<ApiErrorCode, 'apiUnreachable'>;

const STATUS_BY_ERROR_CODE: Readonly<Record<ApiOwnErrorCode, number>> = {
  notFound:               404,
  routeNotFound:          404,
  operationNotOffered:    405,
  malformedRequest:       400,
  validationFailed:       422,
  photoCountOutOfRange:   422,
  photosNotExpected:      409,
  claimSequenceExhausted: 409,
  photoTooLarge:          413,
  unsupportedPhotoType:   415,
  storeUnavailable:       500,
  invalidStoredValue:     500,
  internalError:          500,
};

const ERROR_CODE_BY_PORTAL_ERROR_REASON: Readonly<Record<PortalErrorReason, ApiOwnErrorCode>> = {
  storeUnavailable:   'storeUnavailable',
  invalidStoredValue: 'invalidStoredValue',
};

/** The one place where an error code becomes an HTTP status and an `ApiErrorWire` body. */
export const ApiErrorResponse = {
  statusFor(code: ApiOwnErrorCode): number {
    return STATUS_BY_ERROR_CODE[code];
  },

  bodyFor(code: ApiOwnErrorCode, message: string, fieldErrors?: readonly FieldErrorWire[]): ApiErrorWire {
    return { error: fieldErrors === undefined ? { code, message } : { code, message, fieldErrors } };
  },

  responseFor(code: ApiOwnErrorCode, message: string, fieldErrors?: readonly FieldErrorWire[]): Response {
    return Response.json(ApiErrorResponse.bodyFor(code, message, fieldErrors), { status: ApiErrorResponse.statusFor(code) });
  },

  responseForPortalError(error: PortalError): Response {
    return ApiErrorResponse.responseFor(ERROR_CODE_BY_PORTAL_ERROR_REASON[error.reason], error.message);
  },
} as const;
