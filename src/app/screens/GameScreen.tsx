import { PhaserGame } from "@/app/components/PhaserGame";

export function GameScreen() {
  return (
    <section className="screen game-layout" aria-label="Game">
      <div className="game-toolbar">
        <span>Phase 3 C5 — ロック可のとき Space で拘束（工程→ロック済）。地切り制限は次</span>
        <span>A/D 横行 · W/S 巻上 · Shift 緩速 · 合わせたら Space ロック</span>
      </div>
      <PhaserGame />
    </section>
  );
}
