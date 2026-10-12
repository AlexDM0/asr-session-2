export type ApiErrorCode =
  | 'notFound'
  | 'routeNotFound'
  | 'operationNotOffered'
  | 'malformedRequest'
  | 'validationFailed'
  | 'photoCountOutOfRange'
  | 'photosNotExpected'
  | 'claimSequenceExhausted'
  | 'photoTooLarge'
  | 'unsupportedPhotoType'
  | 'storeUnavailable'
  | 'invalidStoredValue'
  | 'internalError'
  | 'apiUnreachable';

export type FieldErrorReason = 'required' | 'invalidFormat' | 'tooShort' | 'tooLong' | 'inFuture' | 'notEligible' | 'readOnlyField' | 'unknownField';

export interface FieldErrorWire {
  readonly field:  string;
  readonly reason: FieldErrorReason;
}

export interface ApiErrorWire {
  readonly error: {
    readonly code:         ApiErrorCode;
    readonly message:      string;
    readonly fieldErrors?: readonly FieldErrorWire[];
  };
}
