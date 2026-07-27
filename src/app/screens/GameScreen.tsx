import { PhaserGame } from "@/app/components/PhaserGame";

export function GameScreen() {
  return (
    <section className="screen game-layout" aria-label="Game">
      <div className="game-toolbar">
        <span>Phase 2 C2 — layout/config ready; scaffold quay only</span>
        <span>Rapier @ 120 Hz · snapshots @ 60 Hz</span>
      </div>
      <PhaserGame />
    </section>
  );
}
