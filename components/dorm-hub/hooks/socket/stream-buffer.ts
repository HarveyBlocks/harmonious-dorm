import type { Dispatch, SetStateAction } from 'react';

import type { ChatMessage } from '@/components/dorm-hub/ui-types';
import type { StreamState } from './stream-types';

const STREAM_TOKEN_DELAY_MS = (() => {
  const raw = Number(process.env.NEXT_PUBLIC_STREAM_TOKEN_DELAY_MS || '0');
  if (!Number.isFinite(raw) || raw < 0) return 0;
  return Math.floor(raw);
})();

export function createStreamState(): StreamState {
  return {
    bufferByStreamId: new Map<number, string>(),
    timerByStreamId: new Map<number, ReturnType<typeof setTimeout>>(),
    lastEmitAtByStreamId: new Map<number, number>(),
  };
}

export function clearStreamEntry(state: StreamState, streamId: number) {
  const timer = state.timerByStreamId.get(streamId);
  if (timer) clearTimeout(timer);
  state.timerByStreamId.delete(streamId);
  state.bufferByStreamId.delete(streamId);
  state.lastEmitAtByStreamId.delete(streamId);
}

export function clearAllStreamEntries(state: StreamState) {
  state.timerByStreamId.forEach((timer) => clearTimeout(timer));
  state.timerByStreamId.clear();
  state.bufferByStreamId.clear();
  state.lastEmitAtByStreamId.clear();
}

function flushStreamBuffer(state: StreamState, streamId: number, setLiveMessages: Dispatch<SetStateAction<ChatMessage[]>>) {
  const buffered = state.bufferByStreamId.get(streamId);
  if (!buffered) return;
  state.bufferByStreamId.set(streamId, '');
  state.lastEmitAtByStreamId.set(streamId, Date.now());
  setLiveMessages((prev) => prev.map((item) => (item.id === streamId ? { ...item, content: `${item.content}${buffered}` } : item)));
}

export function enqueueStreamDelta(
  state: StreamState,
  streamId: number,
  delta: string,
  setLiveMessages: Dispatch<SetStateAction<ChatMessage[]>>,
) {
  const prev = state.bufferByStreamId.get(streamId) || '';
  state.bufferByStreamId.set(streamId, `${prev}${delta}`);
  scheduleStreamFlush(state, streamId, setLiveMessages);
}

function scheduleStreamFlush(state: StreamState, streamId: number, setLiveMessages: Dispatch<SetStateAction<ChatMessage[]>>) {
  if (STREAM_TOKEN_DELAY_MS <= 0) {
    flushStreamBuffer(state, streamId, setLiveMessages);
    return;
  }
  if (state.timerByStreamId.has(streamId)) return;

  const lastEmitAt = state.lastEmitAtByStreamId.get(streamId) ?? Date.now();
  const elapsed = Date.now() - lastEmitAt;
  if (elapsed >= STREAM_TOKEN_DELAY_MS) {
    flushStreamBuffer(state, streamId, setLiveMessages);
    return;
  }

  const waitMs = STREAM_TOKEN_DELAY_MS - elapsed;
  const timer = setTimeout(() => {
    state.timerByStreamId.delete(streamId);
    flushStreamBuffer(state, streamId, setLiveMessages);
    if (state.bufferByStreamId.get(streamId)) {
      scheduleStreamFlush(state, streamId, setLiveMessages);
    }
  }, waitMs);
  state.timerByStreamId.set(streamId, timer);
}

export function flushStreamEntry(state: StreamState, streamId: number, setLiveMessages: Dispatch<SetStateAction<ChatMessage[]>>) {
  flushStreamBuffer(state, streamId, setLiveMessages);
}
