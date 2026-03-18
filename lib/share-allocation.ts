export interface WeightedParticipant {
  userId: number;
  weight: number;
}

interface CentAllocation {
  userId: number;
  cents: number;
  fraction: number;
}

function buildWeightMap(participantWeights?: WeightedParticipant[]): Map<number, number> {
  const map = new Map<number, number>();
  for (const item of participantWeights || []) {
    map.set(item.userId, item.weight);
  }
  return map;
}

export function normalizeWeights(
  participants: number[],
  participantWeights?: WeightedParticipant[],
): WeightedParticipant[] {
  const weightMap = buildWeightMap(participantWeights);
  return participants.map((userId) => ({
    userId,
    weight: weightMap.get(userId) ?? 1,
  }));
}

export function validateWeights(rows: WeightedParticipant[]): boolean {
  if (rows.length === 0) return false;
  return rows.every((item) => Number.isFinite(item.weight) && item.weight >= 0);
}

function allocateByCents(totalCents: number, rows: WeightedParticipant[]): CentAllocation[] {
  const totalWeight = rows.reduce((sum, item) => sum + item.weight, 0);
  if (!Number.isFinite(totalWeight) || totalWeight <= 0) return [];

  const allocated = rows.map((item) => {
    const exact = (totalCents * item.weight) / totalWeight;
    const cents = Math.floor(exact);
    return { userId: item.userId, cents, fraction: exact - cents };
  });

  let assigned = allocated.reduce((sum, item) => sum + item.cents, 0);
  let remainder = totalCents - assigned;

  allocated.sort((a, b) => {
    if (b.fraction !== a.fraction) return b.fraction - a.fraction;
    return a.userId - b.userId;
  });

  for (let i = 0; i < allocated.length && remainder > 0; i += 1) {
    allocated[i].cents += 1;
    assigned += 1;
    remainder -= 1;
  }

  return assigned === totalCents ? allocated : [];
}

export function allocateAmounts(
  totalAmount: number,
  participants: number[],
  participantWeights?: WeightedParticipant[],
): Map<number, number> {
  const result = new Map<number, number>();
  const totalCents = Math.round(totalAmount * 100);
  if (!Number.isFinite(totalAmount) || totalAmount <= 0 || participants.length === 0) {
    return result;
  }

  const rows = normalizeWeights(participants, participantWeights);
  if (!validateWeights(rows)) return result;

  const allocated = allocateByCents(totalCents, rows);
  for (const item of allocated) {
    result.set(item.userId, item.cents / 100);
  }

  return result;
}
