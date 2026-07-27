import { useEffect, useRef, useState } from "react";
import type Phaser from "phaser";
import { createGame } from "@/game/phaser/createGame";

export function PhaserGame() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const [status, setStatus] = useState("initializing");

  useEffect(() => {
    const host = hostRef.current;
    if (!host || gameRef.current) {
      return;
    }

    let disposed = false;
    let game: Phaser.Game | null = null;

    const boot = async () => {
      try {
        game = await createGame(host);
        if (disposed) {
          game.destroy(true);
          return;
        }
        gameRef.current = game;
        setStatus("ready");
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "unknown error";
        setStatus(`error: ${message}`);
      }
    };

    void boot();

    return () => {
      disposed = true;
      gameRef.current?.destroy(true);
      gameRef.current = null;
      game?.destroy(true);
    };
  }, []);

  return (
    <div className="phaser-host" ref={hostRef} data-testid="phaser-host">
      <div className="phaser-status" data-testid="phaser-status">
        Phaser: {status}
      </div>
    </div>
  );
}
