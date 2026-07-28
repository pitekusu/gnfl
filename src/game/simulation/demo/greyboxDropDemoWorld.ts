import type { RenderSnapshot } from "@/game/protocol";
import type { RapierModule } from "@/game/simulation/rapierInit";
import type RAPIER from "@dimforge/rapier2d-compat";

/**
 * Phase 1 drop demo world (floor + falling box).
 * Kept for regression tests; not used by the default simulation path after Phase 2 C1.
 */
export class GreyboxDemoWorld {
  public static readonly BOX_ID = "demo-box";
  public static readonly FLOOR_ID = "demo-floor";

  public static readonly BOX_SPAWN_Y = -2;
  public static readonly FLOOR_Y = 6;

  private readonly world: RAPIER.World;
  private readonly boxBody: RAPIER.RigidBody;
  private readonly floorBody: RAPIER.RigidBody;
  private readonly boxHalf = { x: 0.75, y: 0.75 };
  private readonly floorHalf = { x: 8, y: 0.35 };
  private readonly physicsDtSeconds: number;

  private constructor(
    world: RAPIER.World,
    boxBody: RAPIER.RigidBody,
    floorBody: RAPIER.RigidBody,
    physicsDtSeconds: number,
  ) {
    this.world = world;
    this.boxBody = boxBody;
    this.floorBody = floorBody;
    this.physicsDtSeconds = physicsDtSeconds;
  }

  public static create(
    rapier: RapierModule,
    gravityY: number,
    physicsHz: number,
  ): GreyboxDemoWorld {
    const physicsDtSeconds = 1 / physicsHz;
    const world = new rapier.World({ x: 0, y: gravityY });
    world.timestep = physicsDtSeconds;

    const floorBody = world.createRigidBody(
      rapier.RigidBodyDesc.fixed().setTranslation(0, GreyboxDemoWorld.FLOOR_Y),
    );
    world.createCollider(
      rapier.ColliderDesc.cuboid(8, 0.35).setFriction(0.9),
      floorBody,
    );

    const boxBody = world.createRigidBody(
      rapier.RigidBodyDesc.dynamic()
        .setTranslation(0, GreyboxDemoWorld.BOX_SPAWN_Y)
        .setLinearDamping(0.02)
        .setAngularDamping(0.05),
    );
    world.createCollider(
      rapier.ColliderDesc.cuboid(0.75, 0.75).setFriction(0.7).setRestitution(0.15),
      boxBody,
    );

    return new GreyboxDemoWorld(world, boxBody, floorBody, physicsDtSeconds);
  }

  public step(): void {
    this.world.timestep = this.physicsDtSeconds;
    this.world.step();
  }

  public resetBox(): void {
    this.boxBody.setTranslation({ x: 0, y: GreyboxDemoWorld.BOX_SPAWN_Y }, true);
    this.boxBody.setLinvel({ x: 0, y: 0 }, true);
    this.boxBody.setAngvel(0, true);
    this.boxBody.setRotation(0, true);
    this.boxBody.wakeUp();
  }

  public buildSnapshot(tick: number, generatedAtMs: number): RenderSnapshot {
    const box = this.boxBody.translation();
    const floor = this.floorBody.translation();

    return {
      tick,
      generatedAtMs,
      stagePhase: "READY",
      entities: [
        {
          id: GreyboxDemoWorld.FLOOR_ID,
          kind: "floor",
          x: floor.x,
          y: floor.y,
          angleRad: this.floorBody.rotation(),
          width: this.floorHalf.x * 2,
          height: this.floorHalf.y * 2,
        },
        {
          id: GreyboxDemoWorld.BOX_ID,
          kind: "box",
          x: box.x,
          y: box.y,
          angleRad: this.boxBody.rotation(),
          width: this.boxHalf.x * 2,
          height: this.boxHalf.y * 2,
        },
      ],
      cables: [],
      instruments: { cableLoad: 0, sway: 0, lockReady: false },
      weather: { windHint: 0, waveHint: 0 },
    };
  }

  public free(): void {
    this.world.free();
  }
}
