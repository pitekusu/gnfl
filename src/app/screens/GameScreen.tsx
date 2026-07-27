import { PhaserGame } from "@/app/components/PhaserGame";

export function GameScreen() {
  return (
    <section className="screen game-layout" aria-label="Game">
      <div className="game-toolbar">
        <span>
          Phase 2 greybox: 急停止で振れ確認 · Shift 緩速 · A/D 横行 · W/S 巻上
        </span>
        <span>DoD: 振れ / 急停止 / 緩速位置合わせ</span>
      </div>
      <PhaserGame />
    </section>
  );
}
