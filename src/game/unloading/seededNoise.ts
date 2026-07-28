import { hashSeedToU32 } from "@/game/unloading/seedHash";

/**
 * Deterministic unit float in [0, 1) from seed + lane.
 * Use for fixed-per-run parameters (not continuous over time).
 */
export function seedUnit(seed: string, lane: number): number {
  const hash = hashSeedToU32(`${seed}|u|${lane}`);
  // Divide by 2^32 so the result is in [0, 1).
  return hash / 0x1_0000_0000;
}

/** Deterministic float in [min, max). */
export function seedRange(
  seed: string,
  lane: number,
  min: number,
  max: number,
): number {
  return min + seedUnit(seed, lane) * (max - min);
}

/**
 * Smooth 1D value noise over time, roughly in [-1, 1].
 * Same (seed, lane, t) always returns the same value — no Math.random.
 *
 * Lattice cells are at integer times (seconds). Values are hermite-interpolated
 * so slow wind/wave envelopes do not click between samples.
 */
export function sampleSeededNoise1D(
  seed: string,
  lane: number,
  tSeconds: number,
): number {
  const x = tSeconds;
  const i0 = Math.floor(x);
  const i1 = i0 + 1;
  const f = x - i0;
  // Smoothstep (Hermite) for C1 continuity of the first derivative-ish feel.
  const u = f * f * (3 - 2 * f);
  const a = latticeValue(seed, lane, i0);
  const b = latticeValue(seed, lane, i1);
  return a + (b - a) * u;
}

/** Smooth noise remapped to [0, 1]. */
export function sampleSeededUnitNoise1D(
  seed: string,
  lane: number,
  tSeconds: number,
): number {
  return sampleSeededNoise1D(seed, lane, tSeconds) * 0.5 + 0.5;
}

/**
 * Simple fractal Brownian motion: sum of octaves of {@link sampleSeededNoise1D}.
 * Result is roughly in [-1, 1] (not strictly clamped).
 */
export function sampleSeededFbm1D(
  seed: string,
  lane: number,
  tSeconds: number,
  octaves = 3,
): number {
  const n = Math.max(1, Math.floor(octaves));
  let amp = 1;
  let freq = 1;
  let sum = 0;
  let norm = 0;
  for (let o = 0; o < n; o += 1) {
    sum += sampleSeededNoise1D(seed, lane + o * 97, tSeconds * freq) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return norm > 0 ? sum / norm : 0;
}

function latticeValue(seed: string, lane: number, cell: number): number {
  // Map unit hash to [-1, 1].
  return seedUnit(`${seed}|n|${lane}`, cell) * 2 - 1;
}
