import type { StagePhase } from "@/game/protocol/stagePhase";

/** Plain renderable body state. No Rapier handles. */
export interface RenderEntityState {
  id: string;
  kind:
    | "box"
    | "floor"
    | "quay"
    | "cradle"
    | "ship"
    | "trolley"
    | "spreader"
    | "cask"
    | "unknown";
  x: number;
  y: number;
  angleRad: number;
  width: number;
  height: number;
}

/** Cable segment for Phaser line drawing (game units). */
export interface CableRenderState {
  id: string;
  ax: number;
  ay: number;
  bx: number;
  by: number;
  tension: number;
}

/** Phase 1 placeholder; weather visuals fill later. */
export interface WeatherVisualState {
  windHint: number;
  waveHint: number;
}

/** Instruments for HUD / later scoring. */
export interface InstrumentState {
  cableLoad: number;
  sway: number;
  /** True when spreader–cask alignment is stable enough to lock (Space). */
  lockReady: boolean;
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
  cables: ReadonlyArray<CableRenderState>;
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
    cables: [],
    instruments: { cableLoad: 0, sway: 0, lockReady: false },
    weather: { windHint: 0, waveHint: 0 },
  };
}
