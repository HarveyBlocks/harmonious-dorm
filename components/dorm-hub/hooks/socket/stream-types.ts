export type StreamState = {
  bufferByStreamId: Map<number, string>;
  timerByStreamId: Map<number, ReturnType<typeof setTimeout>>;
  lastEmitAtByStreamId: Map<number, number>;
};
