import { useEffect, useRef, useState } from "react";
import type Phaser from "phaser";
import { createGame } from "@/game/phaser/createGame";

/**
 * Hosts Phaser. Only low-frequency simulation status crosses into React state.
 * Snapshot positions never enter React.
 */
export function PhaserGame() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const [phaserStatus, setPhaserStatus] = useState("initializing");
  const [workerStatus, setWorkerStatus] = useState("idle");

  useEffect(() => {
    const host = hostRef.current;
    if (!host || gameRef.current) {
      return;
    }

    let disposed = false;
    let game: Phaser.Game | null = null;

    const boot = async () => {
      try {
        game = await createGame(host, {
          onSimulationStatus: (payload) => {
            if (disposed) {
              return;
            }
            if (payload.kind === "phaser") {
              setPhaserStatus(payload.status);
              return;
            }
            if (payload.status === "error") {
              setWorkerStatus(payload.detail ?? "error");
              return;
            }
            setWorkerStatus(payload.status);
          },
        });
        if (disposed) {
          game.destroy(true);
          return;
        }
        gameRef.current = game;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "unknown error";
        if (!disposed) {
          setPhaserStatus(`error: ${message}`);
        }
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
        Phaser: {phaserStatus} · Worker: {workerStatus}
      </div>
    </div>
  );
}
