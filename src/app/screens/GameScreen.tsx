import { PhaserGame } from "@/app/components/PhaserGame";

export function GameScreen() {
  return (
    <section className="screen game-layout" aria-label="Game">
      <div className="game-toolbar">
        <span>Phase 3 C4 — ロック可否判定（可のとき HUD が緑）。拘束は次コミット</span>
        <span>A/D 横行 · W/S 巻上 · Shift 緩速 · 吊具を容器に合わせて Space 準備</span>
      </div>
      <PhaserGame />
    </section>
  );
}
