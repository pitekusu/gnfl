/**
 * Deterministic 32-bit hash for gameplay seeds (not crypto).
 * Same seed string always yields the same u32.
 */
export function hashSeedToU32(seed: string): number {
  // FNV-1a 32-bit
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Map seed bits into [0, 2π). */
export function seedPhase(seed: string, lane: number): number {
  const hash = hashSeedToU32(`${seed}#${lane}`);
  return ((hash % 10_000) / 10_000) * Math.PI * 2;
}
