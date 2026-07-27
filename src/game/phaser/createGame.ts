import Phaser from "phaser";
import {
  SimulationScene,
  type SimulationStatusPayload,
} from "@/game/phaser/scenes/SimulationScene";

export interface CreateGameOptions {
  onSimulationStatus?: (payload: SimulationStatusPayload) => void;
}

export async function createGame(
  parent: HTMLElement,
  options: CreateGameOptions = {},
): Promise<Phaser.Game> {
  const width = Math.max(parent.clientWidth, 640);
  const height = Math.max(parent.clientHeight, 360);

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width,
    height,
    backgroundColor: "#0a1520",
    scene: [SimulationScene],
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    banner: false,
    audio: {
      noAudio: true,
    },
  });

  if (options.onSimulationStatus) {
    game.registry.set("onSimulationStatus", options.onSimulationStatus);
  }

  await waitForSceneReady(game, SimulationScene.KEY);
  return game;
}

function waitForSceneReady(game: Phaser.Game, sceneKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error(`Timed out waiting for scene ${sceneKey}`));
    }, 15_000);

    const tryResolve = () => {
      const scene = game.scene.getScene(sceneKey);
      if (scene?.sys.isActive() || scene?.sys.isPaused()) {
        window.clearTimeout(timeoutId);
        resolve();
        return true;
      }
      return false;
    };

    if (tryResolve()) {
      return;
    }

    game.events.once(Phaser.Core.Events.READY, () => {
      if (tryResolve()) {
        return;
      }
      const scene = game.scene.getScene(sceneKey);
      scene?.events.once(Phaser.Scenes.Events.CREATE, () => {
        window.clearTimeout(timeoutId);
        resolve();
      });
    });
  });
}
