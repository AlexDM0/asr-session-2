import {
  useCallback,
  useId,
  type HTMLAttributes,
  type Ref,
} from 'react';

import styles from './Field.module.css';

export type FieldTextControl = HTMLInputElement | HTMLTextAreaElement;

export interface FieldProps {
  readonly label:         string;
  readonly value:         string;
  readonly onChange:      (value: string) => void;
  readonly name:          string;
  readonly type?:         'text' | 'email' | 'tel';
  readonly inputMode?:    HTMLAttributes<HTMLInputElement>['inputMode'];
  readonly autoComplete?: string;
  readonly placeholder?:  string;
  readonly hint?:         string;
  readonly errorMessage?: string;
  readonly rows?:         number;
  readonly isReadOnly?:   boolean;
  readonly isDisabled?:   boolean;
  readonly ref?:          Ref<FieldTextControl>;
}

function handTextControlTo(reference: Ref<FieldTextControl> | undefined, textControl: FieldTextControl | null): void {
  if (typeof reference === 'function') {
    reference(textControl);
  } else if (reference !== undefined && reference !== null) {
    reference.current = textControl;
  }
}

/** With `rows` the control is a textarea; the hint and the error message describe it through `aria-describedby`. */
export function Field({
  label,
  value,
  onChange,
  name,
  type = 'text',
  inputMode,
  autoComplete,
  placeholder,
  hint,
  errorMessage,
  rows,
  isReadOnly = false,
  isDisabled = false,
  ref,
}: FieldProps) {
  const fieldId = useId();
  const controlId = `${fieldId}-control`;
  const hintId = `${fieldId}-hint`;
  const errorMessageId = `${fieldId}-error`;
  const attachTextControl = useCallback((textControl: FieldTextControl | null) => handTextControlTo(ref, textControl), [ref]);
  const describingIds = [hint === undefined ? null : hintId, errorMessage === undefined ? null : errorMessageId].filter((describingId) => describingId !== null);
  const sharedControlProperties = {
    'id':               controlId,
    name,
    value,
    'readOnly':         isReadOnly,
    'disabled':         isDisabled,
    'className':        styles['control'],
    'aria-invalid':     errorMessage === undefined ? undefined : true,
    'aria-describedby': describingIds.length === 0 ? undefined : describingIds.join(' '),
    'ref':              attachTextControl,
    ...(autoComplete === undefined ? {} : { autoComplete }),
    ...(placeholder === undefined ? {} : { placeholder }),
  };

  return (
    <div className={styles['field']} data-has-error={errorMessage !== undefined}>
      <label className={styles['label']} htmlFor={controlId}>
        {label}
      </label>
      {hint === undefined ? null : (
        <span className={styles['hint']} id={hintId}>
          {hint}
        </span>
      )}
      {rows === undefined ? (
        <input
          {...sharedControlProperties}
          onChange={(changeEvent) => onChange(changeEvent.target.value)}
          type={type}
          {...(inputMode === undefined ? {} : { inputMode })}
        />
      ) : (
        <textarea {...sharedControlProperties} onChange={(changeEvent) => onChange(changeEvent.target.value)} rows={rows} />
      )}
      {errorMessage === undefined ? null : (
        <span className={styles['errorMessage']} id={errorMessageId}>
          {errorMessage}
        </span>
      )}
    </div>
  );
}
