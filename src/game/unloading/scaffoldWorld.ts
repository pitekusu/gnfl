import type { RenderSnapshot } from "@/game/protocol";
import type { RapierModule } from "@/game/simulation/rapierInit";
import type RAPIER from "@dimforge/rapier2d-compat";
import {
  DEFAULT_UNLOADING_LAYOUT,
  type UnloadingLayout,
} from "@/game/unloading/layout";
import { sampleBaseShipMotion } from "@/game/unloading/shipMotion";

/**
 * Phase 2 world foundation: fixed quay/cradle + kinematic moored ship.
 * Trolley, spreader, cables, and cask land in later commits.
 */
export class UnloadingScaffoldWorld {
  public static readonly QUAY_ID = "scaffold-quay";
  public static readonly CRADLE_ID = "scaffold-cradle";
  public static readonly SHIP_ID = "scaffold-ship";

  private readonly world: RAPIER.World;
  private readonly quayBody: RAPIER.RigidBody;
  private readonly cradleBody: RAPIER.RigidBody;
  private readonly shipBody: RAPIER.RigidBody;
  private readonly layout: UnloadingLayout;
  private readonly physicsDtSeconds: number;
  private readonly physicsHz: number;
  private readonly seed: string;
  private lastHeave = 0;
  private tick = 0;

  private constructor(
    world: RAPIER.World,
    quayBody: RAPIER.RigidBody,
    cradleBody: RAPIER.RigidBody,
    shipBody: RAPIER.RigidBody,
    layout: UnloadingLayout,
    physicsDtSeconds: number,
    physicsHz: number,
    seed: string,
  ) {
    this.world = world;
    this.quayBody = quayBody;
    this.cradleBody = cradleBody;
    this.shipBody = shipBody;
    this.layout = layout;
    this.physicsDtSeconds = physicsDtSeconds;
    this.physicsHz = physicsHz;
    this.seed = seed;
  }

  public static create(
    rapier: RapierModule,
    gravityY: number,
    physicsHz: number,
    seed: string,
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

    const bumperHalfHeight = 0.9;
    world.createCollider(
      rapier.ColliderDesc.cuboid(0.25, bumperHalfHeight)
        .setTranslation(
          -layout.quay.halfWidth + 0.25,
          -layout.quay.halfHeight - bumperHalfHeight,
        )
        .setFriction(0.6),
      quayBody,
    );

    const cradleBody = world.createRigidBody(
      rapier.RigidBodyDesc.fixed().setTranslation(
        layout.cradle.centerX,
        layout.cradle.centerY,
      ),
    );
    world.createCollider(
      rapier.ColliderDesc.cuboid(
        layout.cradle.halfWidth,
        layout.cradle.halfHeight,
      ).setFriction(0.95),
      cradleBody,
    );

    const initialShip = sampleBaseShipMotion(seed, 0, {
      x: layout.ship.restCenterX,
      y: layout.ship.restCenterY,
    });

    const shipBody = world.createRigidBody(
      rapier.RigidBodyDesc.kinematicPositionBased()
        .setTranslation(initialShip.x, initialShip.y)
        .setRotation(initialShip.angleRad),
    );

    // Hull collider (visual approx).
    world.createCollider(
      rapier.ColliderDesc.cuboid(
        layout.ship.halfWidth,
        layout.ship.halfHeight,
      ).setFriction(0.7),
      shipBody,
    );

    // Hold floor + walls in ship-local space (follow kinematic transform).
    const holdFloorY = layout.ship.holdFloorOffsetY;
    world.createCollider(
      rapier.ColliderDesc.cuboid(layout.ship.holdHalfWidth, 0.15)
        .setTranslation(0, holdFloorY)
        .setFriction(0.9),
      shipBody,
    );
    const wallLocalY = holdFloorY - layout.ship.holdWallHeight / 2;
    world.createCollider(
      rapier.ColliderDesc.cuboid(
        layout.ship.holdWallHalfThickness,
        layout.ship.holdWallHeight / 2,
      )
        .setTranslation(-layout.ship.holdHalfWidth, wallLocalY)
        .setFriction(0.7),
      shipBody,
    );
    world.createCollider(
      rapier.ColliderDesc.cuboid(
        layout.ship.holdWallHalfThickness,
        layout.ship.holdWallHeight / 2,
      )
        .setTranslation(layout.ship.holdHalfWidth, wallLocalY)
        .setFriction(0.7),
      shipBody,
    );

    const stage = new UnloadingScaffoldWorld(
      world,
      quayBody,
      cradleBody,
      shipBody,
      layout,
      physicsDtSeconds,
      physicsHz,
      seed,
    );
    stage.lastHeave = initialShip.heave;
    return stage;
  }

  public step(): void {
    this.tick += 1;
    const elapsedSeconds = this.tick / this.physicsHz;
    const pose = sampleBaseShipMotion(
      this.seed,
      elapsedSeconds,
      {
        x: this.layout.ship.restCenterX,
        y: this.layout.ship.restCenterY,
      },
      // Phase 4 will feed a non-zero envelope here.
      { highWaveEnvelope: 0 },
    );
    this.lastHeave = pose.heave;
    this.shipBody.setNextKinematicTranslation({ x: pose.x, y: pose.y });
    this.shipBody.setNextKinematicRotation(pose.angleRad);

    this.world.timestep = this.physicsDtSeconds;
    this.world.step();
  }

  public buildSnapshot(tick: number, generatedAtMs: number): RenderSnapshot {
    const quay = this.quayBody.translation();
    const cradle = this.cradleBody.translation();
    const ship = this.shipBody.translation();

    return {
      tick,
      generatedAtMs,
      stagePhase: "READY",
      entities: [
        {
          id: UnloadingScaffoldWorld.SHIP_ID,
          kind: "ship",
          x: ship.x,
          y: ship.y,
          angleRad: this.shipBody.rotation(),
          width: this.layout.ship.halfWidth * 2,
          height: this.layout.ship.halfHeight * 2,
        },
        {
          id: UnloadingScaffoldWorld.QUAY_ID,
          kind: "quay",
          x: quay.x,
          y: quay.y,
          angleRad: this.quayBody.rotation(),
          width: this.layout.quay.halfWidth * 2,
          height: this.layout.quay.halfHeight * 2,
        },
        {
          id: UnloadingScaffoldWorld.CRADLE_ID,
          kind: "cradle",
          x: cradle.x,
          y: cradle.y,
          angleRad: this.cradleBody.rotation(),
          width: this.layout.cradle.halfWidth * 2,
          height: this.layout.cradle.halfHeight * 2,
        },
      ],
      instruments: { cableLoad: 0, sway: 0 },
      weather: {
        windHint: 0,
        waveHint: this.lastHeave,
      },
    };
  }

  public free(): void {
    this.world.free();
  }
}
