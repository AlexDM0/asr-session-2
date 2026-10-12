/** What a read of one resource came to; `failed` carries an English reason for developers, never shown to customers. */
export type ReadVerdict<Value> =
  | { readonly outcome: 'found'; readonly value: Value }
  | { readonly outcome: 'notFound' }
  | { readonly outcome: 'failed'; readonly reason: string };
