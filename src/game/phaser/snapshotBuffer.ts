import type { RenderEntityState, RenderSnapshot } from "@/game/protocol";
import { createEmptyRenderSnapshot } from "@/game/protocol";

export interface SnapshotBufferSample {
  snapshot: RenderSnapshot;
  /** 0 = previous, 1 = current; useful for debugging. */
  alpha: number;
}

interface TimedSnapshot {
  snapshot: RenderSnapshot;
  /** Main-thread arrival time — worker clocks are not used for interpolation. */
  receivedAtMs: number;
}

/**
 * Holds the last two worker snapshots and samples an interpolated pose
 * for display frames (requestAnimationFrame / Phaser update).
 */
export class SnapshotBuffer {
  private previous: TimedSnapshot | null = null;
  private current: TimedSnapshot | null = null;

  public push(
    snapshot: RenderSnapshot,
    receivedAtMs: number = performance.now(),
  ): void {
    if (this.current && snapshot.tick < this.current.snapshot.tick) {
      // Ignore out-of-order snapshots.
      return;
    }
    this.previous = this.current;
    this.current = { snapshot, receivedAtMs };
  }

  public sample(nowMs: number): SnapshotBufferSample | null {
    if (!this.current) {
      return null;
    }
    if (!this.previous || this.previous.snapshot.tick === this.current.snapshot.tick) {
      return { snapshot: this.current.snapshot, alpha: 1 };
    }

    const span = this.current.receivedAtMs - this.previous.receivedAtMs;
    if (span <= 0) {
      return { snapshot: this.current.snapshot, alpha: 1 };
    }

    const rawAlpha = (nowMs - this.previous.receivedAtMs) / span;
    const alpha = clamp(rawAlpha, 0, 1.25);
    // Allow slight extrapolation past the latest snapshot, then clamp poses.
    const drawAlpha = clamp(alpha, 0, 1);
    return {
      snapshot: interpolateSnapshots(
        this.previous.snapshot,
        this.current.snapshot,
        drawAlpha,
      ),
      alpha: drawAlpha,
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

  const previousCables = new Map(previous.cables.map((c) => [c.id, c]));
  const cables = current.cables.map((cable) => {
    const from = previousCables.get(cable.id);
    if (!from) {
      return cable;
    }
    return {
      id: cable.id,
      ax: lerp(from.ax, cable.ax, t),
      ay: lerp(from.ay, cable.ay, t),
      bx: lerp(from.bx, cable.bx, t),
      by: lerp(from.by, cable.by, t),
      tension: lerp(from.tension, cable.tension, t),
    };
  });

  return {
    tick: current.tick,
    generatedAtMs: lerp(previous.generatedAtMs, current.generatedAtMs, t),
    stagePhase: current.stagePhase,
    abortReason: current.abortReason,
    // Terminal result is discrete — never lerp (prefer current when present).
    terminalResult: current.terminalResult ?? previous.terminalResult ?? null,
    entities,
    cables,
    instruments: {
      cableLoad: lerp(previous.instruments.cableLoad, current.instruments.cableLoad, t),
      sway: lerp(previous.instruments.sway, current.instruments.sway, t),
      lockReady: current.instruments.lockReady,
      locked: current.instruments.locked,
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
