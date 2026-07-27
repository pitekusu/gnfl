import type { RenderSnapshot } from "@/game/protocol";
import type { RapierModule } from "@/game/simulation/rapierInit";
import type RAPIER from "@dimforge/rapier2d-compat";
import {
  DEFAULT_UNLOADING_LAYOUT,
  type UnloadingLayout,
} from "@/game/unloading/layout";

/**
 * Phase 2 static foundation: fixed quay deck + transporter cradle.
 * Ship, trolley, spreader, cables, and cask land in later commits.
 */
export class UnloadingScaffoldWorld {
  public static readonly QUAY_ID = "scaffold-quay";
  public static readonly CRADLE_ID = "scaffold-cradle";

  private readonly world: RAPIER.World;
  private readonly quayBody: RAPIER.RigidBody;
  private readonly cradleBody: RAPIER.RigidBody;
  private readonly layout: UnloadingLayout;
  private readonly physicsDtSeconds: number;

  private constructor(
    world: RAPIER.World,
    quayBody: RAPIER.RigidBody,
    cradleBody: RAPIER.RigidBody,
    layout: UnloadingLayout,
    physicsDtSeconds: number,
  ) {
    this.world = world;
    this.quayBody = quayBody;
    this.cradleBody = cradleBody;
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

    // Vertical face on the water-side (left) edge of the quay, local to quay body.
    // Helps keep free bodies from sliding off into the berth later.
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

    return new UnloadingScaffoldWorld(
      world,
      quayBody,
      cradleBody,
      layout,
      physicsDtSeconds,
    );
  }

  public step(): void {
    this.world.timestep = this.physicsDtSeconds;
    this.world.step();
  }

  public buildSnapshot(tick: number, generatedAtMs: number): RenderSnapshot {
    const quay = this.quayBody.translation();
    const cradle = this.cradleBody.translation();

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
      weather: { windHint: 0, waveHint: 0 },
    };
  }

  public free(): void {
    this.world.free();
  }
}
