import { PhaserGame } from "@/app/components/PhaserGame";

export function GameScreen() {
  return (
    <section className="screen game-layout" aria-label="Game">
      <div className="game-toolbar">
        <span>Phase 3 C8 — クリア後 A/D で横行、受台の上で着座中。着座確定は次</span>
        <span>A/D 横行 · W/S 巻上/巻下 · Shift 緩速 · Space ロック</span>
      </div>
      <PhaserGame />
    </section>
  );
}
