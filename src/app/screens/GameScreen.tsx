import { PhaserGame } from "@/app/components/PhaserGame";

export function GameScreen() {
  return (
    <section className="screen game-layout" aria-label="Game">
      <div className="game-toolbar">
        <span>Unloading stage scaffold (greybox later)</span>
        <span>Phase 0 — empty Phaser scene</span>
      </div>
      <PhaserGame />
    </section>
  );
}
