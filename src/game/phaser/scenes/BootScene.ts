import Phaser from "phaser";

/**
 * Empty bootstrap scene for Phase 0.
 * Later phases replace greybox visuals; colliders stay separate from display assets.
 */
export class BootScene extends Phaser.Scene {
  public static readonly KEY = "BootScene";

  public constructor() {
    super(BootScene.KEY);
  }

  public create(): void {
    const { width, height } = this.scale;

    this.add.rectangle(width / 2, height / 2, width, height, 0x0a1520).setOrigin(0.5);

    // Simple horizon band — not gameplay geometry.
    this.add
      .rectangle(width / 2, height * 0.72, width, height * 0.28, 0x122333)
      .setOrigin(0.5, 0);

    this.add
      .text(width / 2, height * 0.38, "GNFL", {
        fontFamily: "Segoe UI, Noto Sans JP, sans-serif",
        fontSize: "48px",
        color: "#d7e6f4",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.5, "Phase 0 — empty Phaser scene", {
        fontFamily: "Segoe UI, Noto Sans JP, sans-serif",
        fontSize: "18px",
        color: "#8fa6b8",
      })
      .setOrigin(0.5);

    this.scale.on("resize", this.handleResize, this);
  }

  public shutdown(): void {
    this.scale.off("resize", this.handleResize, this);
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    const { width, height } = gameSize;
    this.cameras.resize(width, height);
  }
}
