import { seedPhase } from "@/game/unloading/seedHash";
import { sampleSeededUnitNoise1D } from "@/game/unloading/seededNoise";
import {
  DEFAULT_WAVE_ENVIRONMENT_CONFIG,
  type WaveEnvironmentConfig,
} from "@/game/unloading/waveEnvironmentConfig";

export interface ShipRestPose {
  x: number;
  y: number;
}

export interface ShipTransform {
  x: number;
  y: number;
  /** Pitch in radians. Positive tilts clockwise in our Y-down frame. */
  angleRad: number;
  /** Heave offset applied to rest.y (also used as waveHint). */
  heave: number;
  pitch: number;
  /** Continuous amplitude envelope in [minScale, maxScale] after sampling. */
  waveEnvelope: number;
}

export interface BaseShipMotionOptions {
  /** Continuous wave parameters; defaults to {@link DEFAULT_WAVE_ENVIRONMENT_CONFIG}. */
  wave?: WaveEnvironmentConfig;
  /**
   * Legacy extra multiplier for tests / temporary callers (1 + clamp(env, 0, 2)).
   * Prefer tuning {@link WaveEnvironmentConfig} instead of event envelopes.
   */
  highWaveEnvelope?: number;
}

/**
 * Seeded heave + pitch for the moored ship with a slow continuous amplitude envelope.
 * Pure: same seed + time + config ⇒ same pose (no Math.random).
 */
export function sampleBaseShipMotion(
  seed: string,
  elapsedSeconds: number,
  rest: ShipRestPose,
  options: BaseShipMotionOptions = {},
): ShipTransform {
  const wave = options.wave ?? DEFAULT_WAVE_ENVIRONMENT_CONFIG;
  const waveEnvelope = sampleWaveEnvelopeScale(seed, elapsedSeconds, wave);
  const eventScale = 1 + clamp(options.highWaveEnvelope ?? 0, 0, 2);
  const ampScale = waveEnvelope * eventScale;

  const p0 = seedPhase(seed, 0);
  const p1 = seedPhase(seed, 1);
  const p2 = seedPhase(seed, 2);
  const phases = [p0, p1, p2] as const;

  let heaveSum = 0;
  for (let i = 0; i < 3; i += 1) {
    heaveSum +=
      Math.sin(elapsedSeconds * wave.heave.frequencies[i]! + phases[i]!) *
      wave.heave.amplitudes[i]!;
  }
  heaveSum *= wave.heaveAmplitudeScale * ampScale;

  let pitchSum = 0;
  for (let i = 0; i < 3; i += 1) {
    pitchSum +=
      Math.sin(elapsedSeconds * wave.pitch.frequencies[i]! + phases[i]!) *
      wave.pitch.amplitudes[i]!;
  }
  pitchSum *= wave.pitchAmplitudeScale * ampScale;

  return {
    x: rest.x,
    y: rest.y + heaveSum,
    angleRad: pitchSum,
    heave: heaveSum,
    pitch: pitchSum,
    waveEnvelope,
  };
}

/**
 * Slow breathing scale for wave amplitude from seeded unit noise.
 * Remaps [0, 1] noise into [envelope.minScale, envelope.maxScale].
 */
export function sampleWaveEnvelopeScale(
  seed: string,
  elapsedSeconds: number,
  wave: WaveEnvironmentConfig = DEFAULT_WAVE_ENVIRONMENT_CONFIG,
): number {
  const { minScale, maxScale, noiseSpeed, noiseLane } = wave.envelope;
  if (noiseSpeed <= 0 || minScale === maxScale) {
    return (minScale + maxScale) * 0.5;
  }
  const u = sampleSeededUnitNoise1D(seed, noiseLane, elapsedSeconds * noiseSpeed);
  return minScale + u * (maxScale - minScale);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
