import type { StageResult } from "@/game/protocol";

/**
 * Short Japanese banner for the stage-end overlay.
 * Full category breakdown lands on the result screen (C9).
 */
export function formatStageEndBanner(result: StageResult): string {
  if (result.aborted) {
    const reason = result.abortReason ? ` · ${result.abortReason}` : "";
    return `安全中止${reason} · スコア登録不可`;
  }
  if (result.completed && result.scoring) {
    return `完了 · ランク ${result.scoring.grade} · スコア ${result.scoring.score.toLocaleString("ja-JP")}`;
  }
  if (result.completed) {
    return "完了";
  }
  return "工程終了";
}

/**
 * Banner text from HUD-visible phase alone (always available once snapshots land).
 * Prefer {@link formatStageEndBanner} when a full StageResult has arrived.
 */
export function formatStageEndBannerFromPhase(
  stagePhase: string,
  abortReason: string | null,
): string | null {
  if (stagePhase === "SAFE_ABORTED") {
    const reason = abortReason ? ` · ${abortReason}` : "";
    return `安全中止${reason} · スコア登録不可`;
  }
  if (stagePhase === "COMPLETED") {
    return "完了";
  }
  return null;
}
