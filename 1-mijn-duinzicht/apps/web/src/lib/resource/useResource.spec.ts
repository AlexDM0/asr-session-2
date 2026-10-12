/**
 * The hook decides what every data-backed view shows, so what matters is each verdict's state, the
 * time limit that turns a silent read into a failure, that a late or superseded answer can never
 * overwrite a newer state, that it never retries on its own, and that a retry or a new key reads again.
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it }     from 'bun:test';

import type { ReadVerdict } from './ReadVerdict';

import { READ_TIMEOUT_MILLISECONDS, useResource } from './useResource';

const SHORT_TIMEOUT_MILLISECONDS = 30;
const LONGER_THAN_SHORT_TIMEOUT_MILLISECONDS = 80;

interface PendingRead {
  readonly signal: AbortSignal;
  readonly answer: (verdict: ReadVerdict<string>) => void;
}

function controllableLoad(): { readonly load: (signal: AbortSignal) => Promise<ReadVerdict<string>>; readonly pendingReads: PendingRead[] } {
  const pendingReads: PendingRead[] = [];
  const load = (signal: AbortSignal): Promise<ReadVerdict<string>> => new Promise((resolve) => {
    pendingReads.push({ signal, answer: resolve });
  });
  return { load, pendingReads };
}

function pendingReadAt(pendingReads: readonly PendingRead[], index: number): PendingRead {
  const pendingRead = pendingReads[index];
  if (pendingRead === undefined) {
    throw new Error(`Expected a read number ${index + 1}, but only ${pendingReads.length} started.`);
  }
  return pendingRead;
}

function waitMilliseconds(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

describe('useResource', () => {
  it('limits a read to ten seconds by default', () => {
    expect(READ_TIMEOUT_MILLISECONDS).toBe(10_000);
  });

  it('starts as loading and becomes loaded with the found value', async () => {
    const { load, pendingReads } = controllableLoad();
    const { result } = renderHook(() => useResource(load, 'example'));

    expect(result.current.state).toEqual({ status: 'loading' });
    act(() => pendingReadAt(pendingReads, 0).answer({ outcome: 'found', value: 'Example value' }));

    await waitFor(() => expect(result.current.state).toEqual({ status: 'loaded', value: 'Example value' }));
  });

  it('becomes notFound when the read answers not-found', async () => {
    const { load, pendingReads } = controllableLoad();
    const { result } = renderHook(() => useResource(load, 'example'));

    act(() => pendingReadAt(pendingReads, 0).answer({ outcome: 'notFound' }));

    await waitFor(() => expect(result.current.state).toEqual({ status: 'notFound' }));
  });

  it('becomes failed when the read answers failed', async () => {
    const { load, pendingReads } = controllableLoad();
    const { result } = renderHook(() => useResource(load, 'example'));

    act(() => pendingReadAt(pendingReads, 0).answer({ outcome: 'failed', reason: 'Example failure.' }));

    await waitFor(() => expect(result.current.state).toEqual({ status: 'failed' }));
  });

  it('becomes failed when the read rejects instead of answering', async () => {
    const { result } = renderHook(() => useResource(() => Promise.reject(new Error('Example rejection.')), 'example'));

    await waitFor(() => expect(result.current.state).toEqual({ status: 'failed' }));
  });

  it('fails a read without an answer after the time limit, aborts it and ignores its late answer', async () => {
    const { load, pendingReads } = controllableLoad();
    const { result } = renderHook(() => useResource(load, 'example', { timeoutMilliseconds: SHORT_TIMEOUT_MILLISECONDS }));

    await waitFor(() => expect(result.current.state).toEqual({ status: 'failed' }));
    expect(pendingReadAt(pendingReads, 0).signal.aborted).toBe(true);

    act(() => pendingReadAt(pendingReads, 0).answer({ outcome: 'found', value: 'Late value' }));
    await waitMilliseconds(LONGER_THAN_SHORT_TIMEOUT_MILLISECONDS);

    expect(result.current.state).toEqual({ status: 'failed' });
  });

  it('never retries on its own after a failure', async () => {
    const { load, pendingReads } = controllableLoad();
    const { result } = renderHook(() => useResource(load, 'example', { timeoutMilliseconds: SHORT_TIMEOUT_MILLISECONDS }));

    await waitFor(() => expect(result.current.state).toEqual({ status: 'failed' }));
    await waitMilliseconds(LONGER_THAN_SHORT_TIMEOUT_MILLISECONDS);

    expect(pendingReads).toHaveLength(1);
    expect(result.current.state).toEqual({ status: 'failed' });
  });

  it('returns to loading on retry and repeats the read exactly once', async () => {
    const { load, pendingReads } = controllableLoad();
    const { result } = renderHook(() => useResource(load, 'example'));

    act(() => pendingReadAt(pendingReads, 0).answer({ outcome: 'failed', reason: 'Example failure.' }));
    await waitFor(() => expect(result.current.state).toEqual({ status: 'failed' }));

    act(() => result.current.retry());

    expect(result.current.state).toEqual({ status: 'loading' });
    expect(pendingReads).toHaveLength(2);

    act(() => pendingReadAt(pendingReads, 1).answer({ outcome: 'found', value: 'Second value' }));
    await waitFor(() => expect(result.current.state).toEqual({ status: 'loaded', value: 'Second value' }));
    expect(pendingReads).toHaveLength(2);
  });

  it('ignores the answer of an attempt superseded by a retry', async () => {
    const { load, pendingReads } = controllableLoad();
    const { result } = renderHook(() => useResource(load, 'example'));

    act(() => result.current.retry());
    expect(pendingReadAt(pendingReads, 0).signal.aborted).toBe(true);

    act(() => pendingReadAt(pendingReads, 0).answer({ outcome: 'found', value: 'Superseded value' }));
    await waitMilliseconds(LONGER_THAN_SHORT_TIMEOUT_MILLISECONDS);
    expect(result.current.state).toEqual({ status: 'loading' });

    act(() => pendingReadAt(pendingReads, 1).answer({ outcome: 'found', value: 'Current value' }));
    await waitFor(() => expect(result.current.state).toEqual({ status: 'loaded', value: 'Current value' }));
  });

  it('starts a new read when the key changes and ignores the answer for the old key', async () => {
    const { load, pendingReads } = controllableLoad();
    const { result, rerender } = renderHook(({ key }) => useResource(load, key), { initialProps: { key: 'first-example' } });

    act(() => pendingReadAt(pendingReads, 0).answer({ outcome: 'found', value: 'First value' }));
    await waitFor(() => expect(result.current.state).toEqual({ status: 'loaded', value: 'First value' }));

    rerender({ key: 'second-example' });

    expect(result.current.state).toEqual({ status: 'loading' });
    expect(pendingReads).toHaveLength(2);

    act(() => pendingReadAt(pendingReads, 1).answer({ outcome: 'notFound' }));
    await waitFor(() => expect(result.current.state).toEqual({ status: 'notFound' }));
  });
});
