import { PhaserGame } from "@/app/components/PhaserGame";

export function GameScreen() {
  return (
    <section className="screen game-layout" aria-label="Game">
      <div className="game-toolbar">
        <span>Phase 3 C6 — 巻上でケーブル回収可。容器の一体吊上げはロック後のみ</span>
        <span>A/D 横行 · W/S 巻上/巻下 · Shift 緩速 · Space ロック</span>
      </div>
      <PhaserGame />
    </section>
  );
}
