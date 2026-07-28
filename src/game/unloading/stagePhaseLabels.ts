import type { StagePhase } from "@/game/protocol";

/** Short Japanese labels for the React HUD (phase enum stays English in code). */
export const STAGE_PHASE_LABELS: Record<StagePhase, string> = {
  READY: "準備",
  ALIGNING: "位置合わせ",
  LOCKED: "ロック済",
  LIFTING: "吊上げ",
  CLEAR_OF_HOLD: "船倉クリア",
  TRAVERSING: "横行",
  LANDING: "着座中",
  SEATED: "着座",
  COMPLETED: "完了",
  SAFE_ABORTED: "安全中止",
};

export function formatStagePhaseHud(phase: string | null | undefined): string {
  if (phase == null || phase === "") {
    return "準備 (READY)";
  }
  const label = STAGE_PHASE_LABELS[phase as StagePhase];
  if (label) {
    return `${label} (${phase})`;
  }
  return phase;
}

/** Phases where the spreader–cask joint should still be engaged (HUD ロック: 中). */
const LOCK_ENGAGED_PHASES = new Set<StagePhase>([
  "LOCKED",
  "LIFTING",
  "CLEAR_OF_HOLD",
  "TRAVERSING",
  "LANDING",
  "SEATED",
]);

export function isLockEngagedStagePhase(phase: string | null | undefined): boolean {
  if (phase == null || phase === "") {
    return false;
  }
  return LOCK_ENGAGED_PHASES.has(phase as StagePhase);
}
