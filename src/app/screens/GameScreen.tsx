import { PhaserGame } from "@/app/components/PhaserGame";

export function GameScreen() {
  return (
    <section className="screen game-layout" aria-label="Game">
      <div className="game-toolbar">
        <span>Phase 3 C6 — 未ロックは巻上不可。ロック後 W で地切り→吊上げ</span>
        <span>A/D 横行 · S 巻下 · ロック後 W 巻上 · Shift 緩速 · Space ロック</span>
      </div>
      <PhaserGame />
    </section>
  );
}
