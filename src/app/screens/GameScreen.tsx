import { PhaserGame } from "@/app/components/PhaserGame";

export function GameScreen() {
  return (
    <section className="screen game-layout" aria-label="Game">
      <div className="game-toolbar">
        <span>Phase 3 merged — 次は常時の大波と風（イベント天候なし）</span>
        <span>
          A/D 横行 · W/S 巻上/巻下 · Shift 緩速 · Space ロック/解除 · E 非常停止
        </span>
      </div>
      <PhaserGame />
    </section>
  );
}
