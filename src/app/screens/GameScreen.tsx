import { PhaserGame } from "@/app/components/PhaserGame";

export function GameScreen() {
  return (
    <section className="screen game-layout" aria-label="Game">
      <div className="game-toolbar">
        <span>Phase 2 完了相当 — A/D 横行 · W/S 巻上 · Shift 緩速 · Esc 一時停止</span>
        <span>確認: 振れ / 急停止 / 緩速位置合わせ（ロックは Phase 3）</span>
      </div>
      <PhaserGame />
    </section>
  );
}
