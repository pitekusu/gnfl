/**
 * Unloading stage phases. Phase 1 demos stay on READY until the stage machine exists.
 */
export type StagePhase =
  | "READY"
  | "ALIGNING"
  | "LOCKED"
  | "LIFTING"
  | "CLEAR_OF_HOLD"
  | "TRAVERSING"
  | "LANDING"
  | "SEATED"
  | "COMPLETED"
  | "SAFE_ABORTED";
