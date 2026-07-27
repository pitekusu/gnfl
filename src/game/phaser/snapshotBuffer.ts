import type { RenderEntityState, RenderSnapshot } from "@/game/protocol";
import { createEmptyRenderSnapshot } from "@/game/protocol";

export interface SnapshotBufferSample {
  snapshot: RenderSnapshot;
  /** 0 = previous, 1 = current; useful for debugging. */
  alpha: number;
}

/**
 * Holds the last two worker snapshots and samples an interpolated pose
 * for display frames (requestAnimationFrame / Phaser update).
 */
export class SnapshotBuffer {
  private previous: RenderSnapshot | null = null;
  private current: RenderSnapshot | null = null;

  public push(snapshot: RenderSnapshot): void {
    if (this.current && snapshot.tick < this.current.tick) {
      // Ignore out-of-order snapshots.
      return;
    }
    this.previous = this.current;
    this.current = snapshot;
  }

  public sample(nowMs: number): SnapshotBufferSample | null {
    if (!this.current) {
      return null;
    }
    if (!this.previous || this.previous.tick === this.current.tick) {
      return { snapshot: this.current, alpha: 1 };
    }

    const span = this.current.generatedAtMs - this.previous.generatedAtMs;
    if (span <= 0) {
      return { snapshot: this.current, alpha: 1 };
    }

    const rawAlpha = (nowMs - this.previous.generatedAtMs) / span;
    const alpha = clamp(rawAlpha, 0, 1);
    return {
      snapshot: interpolateSnapshots(this.previous, this.current, alpha),
      alpha,
    };
  }

  public clear(): void {
    this.previous = null;
    this.current = null;
  }
}

export function interpolateSnapshots(
  previous: RenderSnapshot,
  current: RenderSnapshot,
  alpha: number,
): RenderSnapshot {
  const t = clamp(alpha, 0, 1);
  const previousById = new Map(previous.entities.map((e) => [e.id, e]));
  const entities: RenderEntityState[] = current.entities.map((entity) => {
    const from = previousById.get(entity.id);
    if (!from) {
      return entity;
    }
    return {
      id: entity.id,
      kind: entity.kind,
      x: lerp(from.x, entity.x, t),
      y: lerp(from.y, entity.y, t),
      angleRad: lerpAngle(from.angleRad, entity.angleRad, t),
      width: lerp(from.width, entity.width, t),
      height: lerp(from.height, entity.height, t),
    };
  });

  return {
    tick: current.tick,
    generatedAtMs: lerp(previous.generatedAtMs, current.generatedAtMs, t),
    stagePhase: current.stagePhase,
    entities,
    instruments: {
      cableLoad: lerp(previous.instruments.cableLoad, current.instruments.cableLoad, t),
      sway: lerp(previous.instruments.sway, current.instruments.sway, t),
    },
    weather: {
      windHint: lerp(previous.weather.windHint, current.weather.windHint, t),
      waveHint: lerp(previous.weather.waveHint, current.weather.waveHint, t),
    },
  };
}

export function createPlaceholderSnapshot(): RenderSnapshot {
  return createEmptyRenderSnapshot(0, 0);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpAngle(a: number, b: number, t: number): number {
  const delta = normalizeAngle(b - a);
  return a + delta * t;
}

function normalizeAngle(angle: number): number {
  const twoPi = Math.PI * 2;
  let value = angle;
  while (value > Math.PI) {
    value -= twoPi;
  }
  while (value < -Math.PI) {
    value += twoPi;
  }
  return value;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
