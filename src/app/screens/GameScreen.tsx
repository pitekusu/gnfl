import { PhaserGame } from "@/app/components/PhaserGame";

export function GameScreen() {
  return (
    <section className="screen game-layout" aria-label="Game">
      <div className="game-toolbar">
        <span>Phase 3 C2 — stage machine pure logic（物理結合は後続）</span>
        <span>A/D 横行 · W/S 巻上 · Shift 緩速 · Space ロックは後続コミット</span>
      </div>
      <PhaserGame />
    </section>
  );
}
