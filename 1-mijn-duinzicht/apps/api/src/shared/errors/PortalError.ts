/**
 * The one app-level error. `refused` means the caller can act on it (an unusable
 * store that a reset repairs); `unrepaired` means the application will not repair it on its own.
 */
export type PortalErrorKind = 'refused' | 'unrepaired';

export type PortalErrorReason = 'storeUnavailable' | 'invalidStoredValue';

export class PortalError extends Error {
  readonly kind: PortalErrorKind;

  readonly reason: PortalErrorReason;

  constructor(kind: PortalErrorKind, reason: PortalErrorReason, message: string) {
    super(message);
    this.name = 'PortalError';
    this.kind = kind;
    this.reason = reason;
  }
}
