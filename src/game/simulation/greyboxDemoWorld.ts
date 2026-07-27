import type { RenderSnapshot } from "@/game/protocol";
import type { RapierModule } from "@/game/simulation/rapierInit";
import type RAPIER from "@dimforge/rapier2d-compat";

/**
 * Minimal Phase 1 demo world: fixed floor + falling box.
 * Y grows downward to match Phaser's coordinate system.
 */
export class GreyboxDemoWorld {
  public static readonly BOX_ID = "demo-box";
  public static readonly FLOOR_ID = "demo-floor";

  private readonly world: RAPIER.World;
  private readonly boxBody: RAPIER.RigidBody;
  private readonly floorBody: RAPIER.RigidBody;
  private readonly boxHalf = { x: 0.6, y: 0.6 };
  private readonly floorHalf = { x: 10, y: 0.3 };

  private constructor(
    world: RAPIER.World,
    boxBody: RAPIER.RigidBody,
    floorBody: RAPIER.RigidBody,
  ) {
    this.world = world;
    this.boxBody = boxBody;
    this.floorBody = floorBody;
  }

  public static create(rapier: RapierModule, gravityY: number): GreyboxDemoWorld {
    const world = new rapier.World({ x: 0, y: gravityY });

    const floorBody = world.createRigidBody(
      rapier.RigidBodyDesc.fixed().setTranslation(0, 8),
    );
    world.createCollider(
      rapier.ColliderDesc.cuboid(10, 0.3).setFriction(0.8),
      floorBody,
    );

    const boxBody = world.createRigidBody(
      rapier.RigidBodyDesc.dynamic().setTranslation(0, 0).setLinearDamping(0.05),
    );
    world.createCollider(
      rapier.ColliderDesc.cuboid(0.6, 0.6).setFriction(0.6).setRestitution(0.05),
      boxBody,
    );

    return new GreyboxDemoWorld(world, boxBody, floorBody);
  }

  public step(): void {
    this.world.step();
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
      instruments: { cableLoad: 0, sway: 0 },
      weather: { windHint: 0, waveHint: 0 },
    };
  }

  public free(): void {
    this.world.free();
  }
}
