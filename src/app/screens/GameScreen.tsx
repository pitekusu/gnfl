import { PhaserGame } from "@/app/components/PhaserGame";

export function GameScreen() {
  return (
    <section className="screen game-layout" aria-label="Game">
      <div className="game-toolbar">
        <span>Phase 3 — 落とし込み着座は即完了 / ロック着座は解除で完了 · E 非常停止</span>
        <span>A/D 横行 · W/S 巻上/巻下 · Shift 緩速 · Space ロック/解除 · E 非常停止</span>


      </div>
      <PhaserGame />
    </section>
  );
}
