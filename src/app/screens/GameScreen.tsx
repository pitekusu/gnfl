import { PhaserGame } from "@/app/components/PhaserGame";

export function GameScreen() {
  return (
    <section className="screen game-layout" aria-label="Game">
      <div className="game-toolbar">
        <span>Phase 3 C7 — ロック→巻上で船倉クリア。低位置では横行が遅い</span>
        <span>A/D 横行 · W/S 巻上/巻下 · Shift 緩速 · Space ロック</span>
      </div>
      <PhaserGame />
    </section>
  );
}
