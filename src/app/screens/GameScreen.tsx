import { PhaserGame } from "@/app/components/PhaserGame";

export function GameScreen() {
  return (
    <section className="screen game-layout" aria-label="Game">
      <div className="game-toolbar">
        <span>Phase 3 C9 — 受台上で降ろして静止すると着座。解除は次</span>
        <span>A/D 横行 · W/S 巻上/巻下 · Shift 緩速 · Space ロック</span>
      </div>
      <PhaserGame />
    </section>
  );
}
