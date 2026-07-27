import type { RenderSnapshot } from "@/game/protocol";
import type { RapierModule } from "@/game/simulation/rapierInit";
import type RAPIER from "@dimforge/rapier2d-compat";
import {
  DEFAULT_UNLOADING_LAYOUT,
  type UnloadingLayout,
} from "@/game/unloading/layout";

/**
 * Minimal Phase 2 starting world: fixed quay deck only.
 * Crane, ship, cask, and cables land in later Phase 2 commits.
 */
export class UnloadingScaffoldWorld {
  public static readonly QUAY_ID = "scaffold-quay";

  private readonly world: RAPIER.World;
  private readonly quayBody: RAPIER.RigidBody;
  private readonly layout: UnloadingLayout;
  private readonly physicsDtSeconds: number;

  private constructor(
    world: RAPIER.World,
    quayBody: RAPIER.RigidBody,
    layout: UnloadingLayout,
    physicsDtSeconds: number,
  ) {
    this.world = world;
    this.quayBody = quayBody;
    this.layout = layout;
    this.physicsDtSeconds = physicsDtSeconds;
  }

  public static create(
    rapier: RapierModule,
    gravityY: number,
    physicsHz: number,
    layout: UnloadingLayout = DEFAULT_UNLOADING_LAYOUT,
  ): UnloadingScaffoldWorld {
    const physicsDtSeconds = 1 / physicsHz;
    const world = new rapier.World({ x: 0, y: gravityY });
    world.timestep = physicsDtSeconds;

    const quayBody = world.createRigidBody(
      rapier.RigidBodyDesc.fixed().setTranslation(
        layout.quay.centerX,
        layout.quay.centerY,
      ),
    );
    world.createCollider(
      rapier.ColliderDesc.cuboid(
        layout.quay.halfWidth,
        layout.quay.halfHeight,
      ).setFriction(0.85),
      quayBody,
    );

    return new UnloadingScaffoldWorld(world, quayBody, layout, physicsDtSeconds);
  }

  public step(): void {
    this.world.timestep = this.physicsDtSeconds;
    this.world.step();
  }

  public buildSnapshot(tick: number, generatedAtMs: number): RenderSnapshot {
    const quay = this.quayBody.translation();

    return {
      tick,
      generatedAtMs,
      stagePhase: "READY",
      entities: [
        {
          id: UnloadingScaffoldWorld.QUAY_ID,
          kind: "quay",
          x: quay.x,
          y: quay.y,
          angleRad: this.quayBody.rotation(),
          width: this.layout.quay.halfWidth * 2,
          height: this.layout.quay.halfHeight * 2,
        },
      ],
      instruments: { cableLoad: 0, sway: 0 },
      weather: { windHint: 0, waveHint: 0 },
    };
  }

  public free(): void {
    this.world.free();
  }
}
