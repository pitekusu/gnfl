import Phaser from "phaser";
import type { RenderEntityState, RenderSnapshot } from "@/game/protocol";
import { SnapshotBuffer } from "@/game/phaser/snapshotBuffer";
import { visibilityToSimulationAction } from "@/game/phaser/visibilityControl";
import {
  CAMERA_FOCUS_Y,
  DEMO_WORLD_HEIGHT,
  PIXELS_PER_UNIT,
  worldSizeToDisplay,
  worldToDisplayX,
  worldToDisplayY,
} from "@/game/phaser/worldView";
import { SimulationClient } from "@/game/worker/SimulationClient";

export type SimulationStatusPayload =
  | { kind: "worker"; status: "connecting" | "ready" | "error"; detail?: string }
  | { kind: "phaser"; status: "ready" };

/**
 * Simulation scene: consumes worker snapshots and draws greybox entities.
 * High-frequency state stays here — not in React.
 */
export class SimulationScene extends Phaser.Scene {
  public static readonly KEY = "SimulationScene";

  private client: SimulationClient | null = null;
  private readonly snapshotBuffer = new SnapshotBuffer();
  private readonly entityViews = new Map<string, Phaser.GameObjects.Rectangle>();
  private statusText: Phaser.GameObjects.Text | null = null;
  private hintText: Phaser.GameObjects.Text | null = null;
  private unsubscribe: (() => void) | null = null;
  private snapshotCount = 0;

  public constructor() {
    super(SimulationScene.KEY);
  }

  public create(): void {
    this.cameras.main.setBackgroundColor(0x0a1520);
    this.fitCamera();

    this.statusText = this.add
      .text(12, 12, "worker: connecting", {
        fontFamily: "Segoe UI, Noto Sans JP, sans-serif",
        fontSize: "14px",
        color: "#8fa6b8",
      })
      .setScrollFactor(0)
      .setDepth(1000);

    this.hintText = this.add
      .text(12, 34, "waiting for snapshots…", {
        fontFamily: "Segoe UI, Noto Sans JP, sans-serif",
        fontSize: "13px",
        color: "#6f8799",
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
          this.snapshotCount += 1;
          // Stamp with main-thread time so interpolation does not depend on worker clocks.
          this.snapshotBuffer.push(message.snapshot, performance.now());
          if (this.snapshotCount === 1 || this.snapshotCount % 30 === 0) {
            const kinds = message.snapshot.entities.map((e) => e.kind).join(", ");
            this.hintText?.setText(
              `snapshots: ${this.snapshotCount} · entities: ${kinds || "(none)"}`,
            );
          }
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

    document.addEventListener("visibilitychange", this.handleVisibilityChange);
    this.scale.on("resize", this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.onShutdown, this);
  }

  public override update(): void {
    const sample = this.snapshotBuffer.sample(performance.now());
    if (!sample) {
      return;
    }
    this.applySnapshot(sample.snapshot);
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
      const fill =
        entity.kind === "quay" || entity.kind === "floor" ? 0x3a4f5f : 0x4f9cff;
      const stroke =
        entity.kind === "quay" || entity.kind === "floor" ? 0x8fa6b8 : 0xd7ecff;
      view = this.add.rectangle(
        worldToDisplayX(entity.x),
        worldToDisplayY(entity.y),
        worldSizeToDisplay(entity.width),
        worldSizeToDisplay(entity.height),
        fill,
      );
      view.setOrigin(0.5, 0.5);
      view.setStrokeStyle(3, stroke);
      this.entityViews.set(entity.id, view);
    }

    view.setPosition(worldToDisplayX(entity.x), worldToDisplayY(entity.y));
    view.setDisplaySize(
      worldSizeToDisplay(entity.width),
      worldSizeToDisplay(entity.height),
    );
    view.setRotation(entity.angleRad);
  }

  private fitCamera(): void {
    const cam = this.cameras.main;
    const targetHeight = DEMO_WORLD_HEIGHT * PIXELS_PER_UNIT;
    const zoom = Math.min(
      cam.height / targetHeight,
      cam.width / (16 * PIXELS_PER_UNIT),
    );
    cam.setZoom(Math.max(0.35, Math.min(zoom * 0.92, 1.4)));
    cam.centerOn(worldToDisplayX(0), worldToDisplayY(CAMERA_FOCUS_Y));
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    this.cameras.resize(gameSize.width, gameSize.height);
    this.fitCamera();
  }

  private readonly handleVisibilityChange = (): void => {
    if (!this.client) {
      return;
    }
    const action = visibilityToSimulationAction(document.visibilityState);
    if (action === "PAUSE") {
      this.client.pause();
      return;
    }
    this.client.resume();
  };

  private emitStatus(payload: SimulationStatusPayload): void {
    const handler = this.game.registry.get("onSimulationStatus") as
      | ((payload: SimulationStatusPayload) => void)
      | undefined;
    handler?.(payload);
  }

  private onShutdown(): void {
    document.removeEventListener("visibilitychange", this.handleVisibilityChange);
    this.scale.off("resize", this.handleResize, this);
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.client?.dispose();
    this.client = null;
    this.snapshotBuffer.clear();
    for (const view of this.entityViews.values()) {
      view.destroy();
    }
    this.entityViews.clear();
  }
}
