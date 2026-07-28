import { useCallback, useState } from "react";
import type { StageResult } from "@/game/protocol";
import { PhaserGame } from "@/app/components/PhaserGame";
import { ResultScreen } from "@/app/screens/ResultScreen";
import { considerPersonalBest } from "@/app/settings/personalBest";
import { getOrCreatePlayerId } from "@/app/settings/playerId";

export interface GameScreenProps {
  onTitle?: () => void;
}

function mergeStageResult(
  prev: StageResult | null,
  incoming: StageResult,
): StageResult {
  if (!prev) {
    return incoming;
  }
  // Prefer a later payload that carries scoring over a synthetic complete.
  if (incoming.scoring && !prev.scoring) {
    return incoming;
  }
  if (prev.scoring && !incoming.scoring) {
    return prev;
  }
  if (incoming.seed && !prev.seed) {
    return { ...prev, seed: incoming.seed };
  }
  return prev;
}

function applyLocalPersonalBest(result: StageResult): boolean | null {
  if (!result.completed || result.aborted || !result.scoring) {
    return null;
  }
  try {
    getOrCreatePlayerId();
    const pb = considerPersonalBest({
      stageId: result.stageId,
      rulesetVersion: result.rulesetVersion,
      score: result.scoring.score,
      grade: result.scoring.grade,
      seed: result.seed,
    });
    return pb.updated;
  } catch {
    // localStorage may be unavailable (private mode); skip PB quietly.
    return null;
  }
}

export function GameScreen({ onTitle }: GameScreenProps) {
  const [result, setResult] = useState<StageResult | null>(null);
  const [runKey, setRunKey] = useState(0);
  const [personalBestUpdated, setPersonalBestUpdated] = useState<boolean | null>(null);

  const handleStageEnd = useCallback((stageResult: StageResult) => {
    setResult((prev) => mergeStageResult(prev, stageResult));

    if (stageResult.aborted) {
      setPersonalBestUpdated(null);
      return;
    }
    if (!stageResult.completed || !stageResult.scoring) {
      return;
    }
    // Once per result-screen session (ignore duplicate worker/HUD notifies).
    setPersonalBestUpdated((prev) => {
      if (prev !== null) {
        return prev;
      }
      return applyLocalPersonalBest(stageResult);
    });
  }, []);

  const handleRetry = useCallback(() => {
    setResult(null);
    setPersonalBestUpdated(null);
    setRunKey((k) => k + 1);
  }, []);

  const handleTitle = useCallback(() => {
    setResult(null);
    setPersonalBestUpdated(null);
    onTitle?.();
  }, [onTitle]);

  if (result) {
    return (
      <ResultScreen
        result={result}
        onRetry={handleRetry}
        onTitle={handleTitle}
        personalBestUpdated={personalBestUpdated}
      />
    );
  }

  return (
    <section className="screen game-layout" aria-label="Game">
      <div className="game-toolbar">
        <span>Phase 5 — 完了 / 安全中止で結果画面へ</span>
        <span>
          A/D 横行 · W/S 巻上/巻下 · Shift 緩速 · Space ロック/解除 · E 非常停止
        </span>
      </div>
      <PhaserGame key={runKey} onStageEnd={handleStageEnd} />
    </section>
  );
}
