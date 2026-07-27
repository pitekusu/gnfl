import Phaser from "phaser";
import { BootScene } from "@/game/phaser/scenes/BootScene";

export async function createGame(parent: HTMLElement): Promise<Phaser.Game> {
  const width = Math.max(parent.clientWidth, 640);
  const height = Math.max(parent.clientHeight, 360);

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width,
    height,
    backgroundColor: "#0a1520",
    scene: [BootScene],
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    banner: false,
    audio: {
      noAudio: true,
    },
  });

  await waitForSceneReady(game, BootScene.KEY);
  return game;
}

function waitForSceneReady(game: Phaser.Game, sceneKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error(`Timed out waiting for scene ${sceneKey}`));
    }, 10_000);

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
