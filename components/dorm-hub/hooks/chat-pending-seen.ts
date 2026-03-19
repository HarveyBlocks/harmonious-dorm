import type { MutableRefObject } from 'react';

export function consumeSeenPendingChats(options: {
  pendingIdsRef: MutableRefObject<Set<number>>;
  messageRefs: MutableRefObject<Record<number, HTMLDivElement | null>>;
  viewportBottom: number;
  offsetPx?: number;
}): { remaining: number; changed: boolean } {
  const { pendingIdsRef, messageRefs, viewportBottom, offsetPx = 8 } = options;
  const pending = pendingIdsRef.current;
  if (pending.size === 0) return { remaining: 0, changed: false };

  const seenIds: number[] = [];
  pending.forEach((id) => {
    const node = messageRefs.current[id];
    if (!node) return;
    if (node.offsetTop <= viewportBottom - offsetPx) {
      seenIds.push(id);
    }
  });

  if (seenIds.length === 0) return { remaining: pending.size, changed: false };
  for (const id of seenIds) pending.delete(id);
  return { remaining: pending.size, changed: true };
}
