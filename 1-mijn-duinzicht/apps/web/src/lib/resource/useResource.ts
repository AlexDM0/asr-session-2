import {
  useCallback,
  useEffect,
  useEffectEvent,
  useState,
} from 'react';

import type { ReadVerdict } from './ReadVerdict';

export const READ_TIMEOUT_MILLISECONDS = 10_000;

export type ResourceState<Value> =
  | { readonly status: 'loading' }
  | { readonly status: 'loaded'; readonly value: Value }
  | { readonly status: 'notFound' }
  | { readonly status: 'failed' };

export interface ResourceOptions {
  readonly timeoutMilliseconds?: number;
}

export interface Resource<Value> {
  readonly state: ResourceState<Value>;
  /** Shows `loading` again and repeats the read once; the hook never retries on its own. */
  readonly retry: () => void;
}

interface SettledRead<Value> {
  readonly key:           string;
  readonly attemptNumber: number;
  readonly state:         ResourceState<Value>;
}

const LOADING_STATE = { status: 'loading' } as const;

function resourceStateFor<Value>(verdict: ReadVerdict<Value>): ResourceState<Value> {
  switch (verdict.outcome) {
    case 'found':
      return { status: 'loaded', value: verdict.value };
    case 'notFound':
      return { status: 'notFound' };
    case 'failed':
      return { status: 'failed' };
  }
}

/**
 * Reads one resource for a view: `loading` until the read answers, then its verdict. A new `key` starts a new read;
 * an answer that belongs to an abandoned or superseded attempt is ignored.
 */
export function useResource<Value>(
  load: (signal: AbortSignal) => Promise<ReadVerdict<Value>>,
  key: string,
  options: ResourceOptions = {},
): Resource<Value> {
  const timeoutMilliseconds = options.timeoutMilliseconds ?? READ_TIMEOUT_MILLISECONDS;
  const [attemptNumber, setAttemptNumber] = useState(0);
  const [settledRead, setSettledRead] = useState<SettledRead<Value> | null>(null);
  const loadLatest = useEffectEvent(load);

  useEffect(() => {
    const abortController = new AbortController();
    let attemptIsSettled = false;
    const settle = (state: ResourceState<Value>): void => {
      if (attemptIsSettled) {
        return;
      }
      attemptIsSettled = true;
      clearTimeout(timeLimit);
      setSettledRead({ key, attemptNumber, state });
    };
    // The one clock rule of a read: no answer within the limit counts as failed, so a silent API never leaves a view loading.
    const timeLimit = setTimeout(() => {
      settle({ status: 'failed' });
      abortController.abort();
    }, timeoutMilliseconds);
    loadLatest(abortController.signal).then(
      (verdict) => settle(resourceStateFor(verdict)),
      () => settle({ status: 'failed' }),
    );
    return () => {
      attemptIsSettled = true;
      clearTimeout(timeLimit);
      abortController.abort();
    };
  }, [key, attemptNumber, timeoutMilliseconds]);

  const retry = useCallback(() => setAttemptNumber((previousAttemptNumber) => previousAttemptNumber + 1), []);
  const settledReadIsCurrent = settledRead !== null && settledRead.key === key && settledRead.attemptNumber === attemptNumber;
  return { state: settledReadIsCurrent ? settledRead.state : LOADING_STATE, retry };
}
