import type { RenderSnapshot } from "@/game/protocol";
import type { RapierModule } from "@/game/simulation/rapierInit";
import type RAPIER from "@dimforge/rapier2d-compat";

/**
 * Minimal Phase 2 starting world: fixed quay deck only.
 * Crane, ship, cask, and cables land in later Phase 2 commits.
 */
export class UnloadingScaffoldWorld {
  public static readonly QUAY_ID = "scaffold-quay";
  public static readonly QUAY_Y = 7;
  public static readonly QUAY_HALF = { x: 14, y: 0.4 };

  private readonly world: RAPIER.World;
  private readonly quayBody: RAPIER.RigidBody;
  private readonly physicsDtSeconds: number;

  private constructor(
    world: RAPIER.World,
    quayBody: RAPIER.RigidBody,
    physicsDtSeconds: number,
  ) {
    this.world = world;
    this.quayBody = quayBody;
    this.physicsDtSeconds = physicsDtSeconds;
  }

  public static create(
    rapier: RapierModule,
    gravityY: number,
    physicsHz: number,
  ): UnloadingScaffoldWorld {
    const physicsDtSeconds = 1 / physicsHz;
    const world = new rapier.World({ x: 0, y: gravityY });
    world.timestep = physicsDtSeconds;

    const quayBody = world.createRigidBody(
      rapier.RigidBodyDesc.fixed().setTranslation(0, UnloadingScaffoldWorld.QUAY_Y),
    );
    world.createCollider(
      rapier.ColliderDesc.cuboid(
        UnloadingScaffoldWorld.QUAY_HALF.x,
        UnloadingScaffoldWorld.QUAY_HALF.y,
      ).setFriction(0.85),
      quayBody,
    );

    return new UnloadingScaffoldWorld(world, quayBody, physicsDtSeconds);
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
          width: UnloadingScaffoldWorld.QUAY_HALF.x * 2,
          height: UnloadingScaffoldWorld.QUAY_HALF.y * 2,
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
