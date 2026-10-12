import type { Policy } from '../../shared/model/Policy';

export interface PolicySheetDocument {
  readonly fileName: string;
  readonly lines:    readonly string[];
}

/** The stub policy sheet: its Dutch text lines and the file name it is offered under. */
export function policySheetDocumentFor(policy: Policy, fullName: string): PolicySheetDocument {
  return {
    fileName: `polisblad-${policy.id}.pdf`,
    lines:    [
      'Polisblad',
      policy.name,
      `Polisnummer ${policy.id}`,
      fullName,
      'Dit is een voorbeelddocument van Duinzicht Verzekeringen.',
    ],
  };
}
