import Phaser from "phaser";
import type { RenderEntityState, RenderSnapshot } from "@/game/protocol";
import {
  CAMERA_FOCUS_Y,
  worldSizeToDisplay,
  worldToDisplayX,
  worldToDisplayY,
} from "@/game/phaser/worldView";
import { SimulationClient } from "@/game/worker/SimulationClient";

export type SimulationStatusPayload =
  | { kind: "worker"; status: "connecting" | "ready" | "error"; detail?: string }
  | { kind: "phaser"; status: "ready" };

/**
 * Phase 1 scene: consumes worker snapshots and draws greybox entities.
 * High-frequency state stays here — not in React.
 */
export class SimulationScene extends Phaser.Scene {
  public static readonly KEY = "SimulationScene";

  private client: SimulationClient | null = null;
  private latestSnapshot: RenderSnapshot | null = null;
  private readonly entityViews = new Map<string, Phaser.GameObjects.Rectangle>();
  private statusText: Phaser.GameObjects.Text | null = null;
  private unsubscribe: (() => void) | null = null;

  public constructor() {
    super(SimulationScene.KEY);
  }

  public create(): void {
    this.cameras.main.setBackgroundColor(0x0a1520);
    this.cameras.main.centerOn(worldToDisplayX(0), worldToDisplayY(CAMERA_FOCUS_Y));

    this.statusText = this.add
      .text(12, 12, "worker: connecting", {
        fontFamily: "Segoe UI, Noto Sans JP, sans-serif",
        fontSize: "14px",
        color: "#8fa6b8",
      })
      .setScrollFactor(0)
      .setDepth(1000);

    this.emitStatus({ kind: "worker", status: "connecting" });
    this.emitStatus({ kind: "phaser", status: "ready" });

    this.client = new SimulationClient();
    this.unsubscribe = this.client.subscribe((message) => {
      switch (message.type) {
        case "READY":
          this.statusText?.setText(`worker: ready (v${message.protocolVersion})`);
          this.emitStatus({ kind: "worker", status: "ready" });
          break;
        case "SNAPSHOT":
          // C6: apply latest snapshot directly (interpolation arrives next).
          this.latestSnapshot = message.snapshot;
          break;
        case "ERROR":
          this.statusText?.setText(`worker error: ${message.code}`);
          this.emitStatus({
            kind: "worker",
            status: "error",
            detail: `${message.code}: ${message.message}`,
          });
          break;
        default:
          break;
      }
    });
    this.client.start({ seed: "phase1-greybox" });

    this.scale.on("resize", this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.onShutdown, this);
  }

  public override update(): void {
    if (!this.latestSnapshot) {
      return;
    }
    this.applySnapshot(this.latestSnapshot);
  }

  private applySnapshot(snapshot: RenderSnapshot): void {
    const seen = new Set<string>();
    for (const entity of snapshot.entities) {
      seen.add(entity.id);
      this.syncEntity(entity);
    }
    for (const [id, view] of this.entityViews) {
      if (!seen.has(id)) {
        view.destroy();
        this.entityViews.delete(id);
      }
    }
  }

  private syncEntity(entity: RenderEntityState): void {
    let view = this.entityViews.get(entity.id);
    if (!view) {
      view = this.add.rectangle(
        worldToDisplayX(entity.x),
        worldToDisplayY(entity.y),
        worldSizeToDisplay(entity.width),
        worldSizeToDisplay(entity.height),
        entity.kind === "floor" ? 0x243441 : 0x4f9cff,
      );
      view.setStrokeStyle(2, entity.kind === "floor" ? 0x3d5566 : 0x9ec5ff);
      this.entityViews.set(entity.id, view);
    }

    view.setPosition(worldToDisplayX(entity.x), worldToDisplayY(entity.y));
    view.setDisplaySize(
      worldSizeToDisplay(entity.width),
      worldSizeToDisplay(entity.height),
    );
    view.setRotation(entity.angleRad);
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    this.cameras.resize(gameSize.width, gameSize.height);
    this.cameras.main.centerOn(worldToDisplayX(0), worldToDisplayY(CAMERA_FOCUS_Y));
  }

  private emitStatus(payload: SimulationStatusPayload): void {
    const handler = this.game.registry.get("onSimulationStatus") as
      | ((payload: SimulationStatusPayload) => void)
      | undefined;
    handler?.(payload);
  }

  private onShutdown(): void {
    this.scale.off("resize", this.handleResize, this);
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.client?.dispose();
    this.client = null;
    for (const view of this.entityViews.values()) {
      view.destroy();
    }
    this.entityViews.clear();
  }
}
