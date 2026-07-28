import { useCallback, useState } from "react";
import type { StageResult } from "@/game/protocol";
import { PhaserGame } from "@/app/components/PhaserGame";
import { ResultScreen } from "@/app/screens/ResultScreen";

export interface GameScreenProps {
  onTitle?: () => void;
}

export function GameScreen({ onTitle }: GameScreenProps) {
  const [result, setResult] = useState<StageResult | null>(null);
  const [runKey, setRunKey] = useState(0);

  const handleStageEnd = useCallback((stageResult: StageResult) => {
    setResult((prev) => {
      if (!prev) {
        return stageResult;
      }
      // Prefer a later payload that carries scoring over a synthetic complete.
      if (stageResult.scoring && !prev.scoring) {
        return stageResult;
      }
      if (prev.scoring && !stageResult.scoring) {
        return prev;
      }
      if (stageResult.seed && !prev.seed) {
        return { ...prev, seed: stageResult.seed };
      }
      return prev;
    });
  }, []);

  const handleRetry = useCallback(() => {
    setResult(null);
    setRunKey((k) => k + 1);
  }, []);

  const handleTitle = useCallback(() => {
    setResult(null);
    onTitle?.();
  }, [onTitle]);

  if (result) {
    return <ResultScreen result={result} onRetry={handleRetry} onTitle={handleTitle} />;
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
