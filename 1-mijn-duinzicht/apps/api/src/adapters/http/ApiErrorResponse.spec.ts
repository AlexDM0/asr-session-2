/**
 * The error table is the one place where a code becomes a status, so every code is pinned to the
 * status the API answers it with, and the body is checked against `ApiErrorWire`, with `fieldErrors`
 * present only when given.
 */
import { describe, expect, it } from 'bun:test';

import { PortalError } from '../../shared/errors/PortalError';

import { ApiErrorResponse, type ApiOwnErrorCode } from './ApiErrorResponse';

const EXPECTED_STATUS_BY_CODE: readonly (readonly [ApiOwnErrorCode, number])[] = [
  ['notFound', 404],
  ['routeNotFound', 404],
  ['operationNotOffered', 405],
  ['malformedRequest', 400],
  ['validationFailed', 422],
  ['photoCountOutOfRange', 422],
  ['photosNotExpected', 409],
  ['claimSequenceExhausted', 409],
  ['photoTooLarge', 413],
  ['unsupportedPhotoType', 415],
  ['storeUnavailable', 500],
  ['invalidStoredValue', 500],
  ['internalError', 500],
];

describe('ApiErrorResponse', () => {
  it('maps each of the 13 API error codes to its status', () => {
    expect(EXPECTED_STATUS_BY_CODE).toHaveLength(13);
    for (const [code, status] of EXPECTED_STATUS_BY_CODE) {
      expect(ApiErrorResponse.statusFor(code)).toBe(status);
    }
  });

  it('answers a JSON error body with the code and the English message, without fieldErrors when none are given', async () => {
    const response = ApiErrorResponse.responseFor('notFound', 'No example with id EX-1.');

    expect(response.status).toBe(404);
    expect(response.headers.get('content-type')).toStartWith('application/json');
    expect(await response.json()).toStrictEqual({ error: { code: 'notFound', message: 'No example with id EX-1.' } });
  });

  it('includes the field errors of a validation failure', async () => {
    const response = ApiErrorResponse.responseFor('validationFailed', 'Example validation failed.', [{ field: 'exampleField', reason: 'required' }]);

    expect(response.status).toBe(422);
    const expectedFieldErrors = [{ field: 'exampleField', reason: 'required' }];
    expect(await response.json()).toStrictEqual({ error: { code: 'validationFailed', message: 'Example validation failed.', fieldErrors: expectedFieldErrors } });
  });

  it('answers a PortalError with the code of its reason', async () => {
    const response = ApiErrorResponse.responseForPortalError(new PortalError('unrepaired', 'invalidStoredValue', 'Example invalid value.'));

    expect(response.status).toBe(500);
    expect(await response.json()).toStrictEqual({ error: { code: 'invalidStoredValue', message: 'Example invalid value.' } });
  });
});
