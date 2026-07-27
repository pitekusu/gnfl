/**
 * Simulation parameters sent with INIT/RESET.
 * Values are game units, not real equipment units.
 */
export interface SimulationConfig {
  /** Physics ticks per second. Directive: fixed 120. */
  physicsHz: number;
  /** Snapshot post rate from worker to main. Initial: 60. */
  snapshotHz: number;
  /** Max fixed steps applied in one worker loop to avoid spiral of death. */
  maxCatchUpTicks: number;
  /** Gravity Y in game units / s^2 (positive = down for our Rapier setup). */
  gravityY: number;
  /**
   * Phase 1 demo: replay the drop every N physics ticks so the fall stays visible.
   * 0 disables replay.
   */
  demoReplayTicks: number;
}

export const DEFAULT_SIMULATION_CONFIG: SimulationConfig = {
  physicsHz: 120,
  snapshotHz: 60,
  maxCatchUpTicks: 8,
  // Mild gravity so the drop lasts ~1.5–2s and is easy to notice.
  gravityY: 12,
  // Replay every 4 seconds at 120 Hz.
  demoReplayTicks: 480,
};
