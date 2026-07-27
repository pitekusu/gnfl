import { PhaserGame } from "@/app/components/PhaserGame";

export function GameScreen() {
  return (
    <section className="screen game-layout" aria-label="Game">
      <div className="game-toolbar">
        <span>操作: A/D 横行 · W/S 巻上 · Shift で右上に「緩速状態」表示</span>
        <span>Rapier @ 120 Hz · snapshots @ 60 Hz</span>
      </div>
      <PhaserGame />
    </section>
  );
}
