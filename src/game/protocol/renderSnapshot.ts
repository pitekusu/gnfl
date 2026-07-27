import type { StagePhase } from "@/game/protocol/stagePhase";

/** Plain renderable body state. No Rapier handles. */
export interface RenderEntityState {
  id: string;
  kind: "box" | "floor" | "quay" | "cradle" | "ship" | "trolley" | "unknown";
  x: number;
  y: number;
  angleRad: number;
  width: number;
  height: number;
}

/** Phase 1 placeholder; weather visuals fill later. */
export interface WeatherVisualState {
  windHint: number;
  waveHint: number;
}

/** Phase 1 placeholder instruments. */
export interface InstrumentState {
  cableLoad: number;
  sway: number;
}

/**
 * Draw-only snapshot. Must be structured-clone / JSON safe.
 * Never include World, RigidBody, Collider, or WASM memory.
 */
export interface RenderSnapshot {
  tick: number;
  generatedAtMs: number;
  stagePhase: StagePhase;
  entities: ReadonlyArray<RenderEntityState>;
  instruments: InstrumentState;
  weather: WeatherVisualState;
}

export function createEmptyRenderSnapshot(
  tick: number,
  generatedAtMs: number,
): RenderSnapshot {
  return {
    tick,
    generatedAtMs,
    stagePhase: "READY",
    entities: [],
    instruments: { cableLoad: 0, sway: 0 },
    weather: { windHint: 0, waveHint: 0 },
  };
}
