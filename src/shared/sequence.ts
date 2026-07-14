export function mulberry32(a: number): () => number {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateDailySequence(dailySeed: number, count = 500): number[] {
  const rand = mulberry32(dailySeed);
  const sequence: number[] = [];
  for (let i = 0; i < count; i++) {
    sequence.push(Math.floor(rand() * 4) + 1); // tiers 1-4
  }
  return sequence;
}
