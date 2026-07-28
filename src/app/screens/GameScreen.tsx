import { PhaserGame } from "@/app/components/PhaserGame";

export function GameScreen() {
  return (
    <section className="screen game-layout" aria-label="Game">
      <div className="game-toolbar">
        <span>Phase 3 C10 — 着座後 Space で解除・完了。クレーンは岸壁側スタート</span>
        <span>A/D 横行 · W/S 巻上/巻下 · Shift 緩速 · Space ロック/解除</span>

      </div>
      <PhaserGame />
    </section>
  );
}
