import { PhaserGame } from "@/app/components/PhaserGame";

export function GameScreen() {
  return (
    <section className="screen game-layout" aria-label="Game">
      <div className="game-toolbar">
        <span>Phase 1 greybox — blue box drops onto the floor (loops every ~4s)</span>
        <span>Rapier @ 120 Hz · snapshots @ 60 Hz</span>
      </div>
      <PhaserGame />
    </section>
  );
}
