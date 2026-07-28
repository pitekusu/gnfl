import type {
  CableRenderState,
  PlayerInput,
  RenderSnapshot,
  StagePhase,
} from "@/game/protocol";
import { createNeutralPlayerInput } from "@/game/protocol";
import type { RapierModule } from "@/game/simulation/rapierInit";
import type RAPIER from "@dimforge/rapier2d-compat";
import {
  clampCableTargetLength,
  computeCableForce,
  type Vec2,
} from "@/game/unloading/cableForces";
import {
  DEFAULT_CRANE_PHYSICS_CONFIG,
  type CranePhysicsConfig,
} from "@/game/unloading/cranePhysicsConfig";
import {
  DEFAULT_UNLOADING_LAYOUT,
  type UnloadingLayout,
} from "@/game/unloading/layout";
import { integrateCableTargetLength } from "@/game/unloading/hoistMotion";
import { DEFAULT_LOCK_CONFIG, type LockConfig } from "@/game/unloading/lockConfig";
import { evaluateLockAlignment } from "@/game/unloading/lockAlignment";
import { sampleBaseShipMotion } from "@/game/unloading/shipMotion";
import {
  createInitialStageMachineState,
  reduceStage,
  type StageMachineEvent,
  type StageMachineState,
} from "@/game/unloading/stageMachine";
import { integrateTrolleyOnRail } from "@/game/unloading/trolleyMotion";

/**
 * Unloading greybox world: quay/cradle, ship, trolley, cables, free cask.
 * Stage machine is owned here; lock joint engages on Space when lockReady.
 */
export class UnloadingScaffoldWorld {
  public static readonly QUAY_ID = "scaffold-quay";
  public static readonly CRADLE_ID = "scaffold-cradle";
  public static readonly SHIP_ID = "scaffold-ship";
  public static readonly TROLLEY_ID = "scaffold-trolley";
  public static readonly SPREADER_ID = "scaffold-spreader";
  public static readonly CASK_ID = "scaffold-cask";

  private readonly rapier: RapierModule;
  private readonly world: RAPIER.World;
  private readonly quayBody: RAPIER.RigidBody;
  private readonly cradleBody: RAPIER.RigidBody;
  private readonly shipBody: RAPIER.RigidBody;
  private readonly trolleyBody: RAPIER.RigidBody;
  private readonly spreaderBody: RAPIER.RigidBody;
  private readonly caskBody: RAPIER.RigidBody;
  private readonly layout: UnloadingLayout;
  private readonly physics: CranePhysicsConfig;
  private readonly lockConfig: LockConfig;
  private readonly physicsDtSeconds: number;
  private readonly physicsHz: number;
  private readonly seed: string;
  private lastHeave = 0;
  private tick = 0;
  private trolleyX: number;
  private trolleyVelocity = 0;
  private cableTargetLength: number;
  private lastCableTension = 0;
  private lastCableLength = 0;
  private lastCables: CableRenderState[] = [];
  private control: PlayerInput = createNeutralPlayerInput();
  private stage: StageMachineState = createInitialStageMachineState();
  private alignStableTicks = 0;
  private lockReady = false;
  private lockJoint: RAPIER.ImpulseJoint | null = null;

  private constructor(
    rapier: RapierModule,
    world: RAPIER.World,
    quayBody: RAPIER.RigidBody,
    cradleBody: RAPIER.RigidBody,
    shipBody: RAPIER.RigidBody,
    trolleyBody: RAPIER.RigidBody,
    spreaderBody: RAPIER.RigidBody,
    caskBody: RAPIER.RigidBody,
    layout: UnloadingLayout,
    physics: CranePhysicsConfig,
    lockConfig: LockConfig,
    physicsDtSeconds: number,
    physicsHz: number,
    seed: string,
    trolleyX: number,
    cableTargetLength: number,
  ) {
    this.rapier = rapier;
    this.world = world;
    this.quayBody = quayBody;
    this.cradleBody = cradleBody;
    this.shipBody = shipBody;
    this.trolleyBody = trolleyBody;
    this.spreaderBody = spreaderBody;
    this.caskBody = caskBody;
    this.layout = layout;
    this.physics = physics;
    this.lockConfig = lockConfig;
    this.physicsDtSeconds = physicsDtSeconds;
    this.physicsHz = physicsHz;
    this.seed = seed;
    this.trolleyX = trolleyX;
    this.cableTargetLength = cableTargetLength;
  }

  public static create(
    rapier: RapierModule,
    gravityY: number,
    physicsHz: number,
    seed: string,
    layout: UnloadingLayout = DEFAULT_UNLOADING_LAYOUT,
    physics: CranePhysicsConfig = DEFAULT_CRANE_PHYSICS_CONFIG,
    lockConfig: LockConfig = DEFAULT_LOCK_CONFIG,
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

    // No solid outer hull collider — it would trap the cask. Hold floor/walls only.
    // The ship entity remains a visual greybox from layout half extents.

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

    const trolleyX = layout.crane.spreaderSpawnX;
    const trolleyBody = world.createRigidBody(
      rapier.RigidBodyDesc.kinematicPositionBased().setTranslation(
        trolleyX,
        layout.crane.railY,
      ),
    );
    world.createCollider(
      rapier.ColliderDesc.cuboid(
        layout.crane.trolleyHalfWidth,
        layout.crane.trolleyHalfHeight,
      ).setFriction(0.2),
      trolleyBody,
    );

    const cableTargetLength = clampCableTargetLength(
      physics.hoist.initialCableLength,
      physics.hoist.minCableLength,
      physics.hoist.maxCableLength,
    );

    const spreaderBody = world.createRigidBody(
      rapier.RigidBodyDesc.dynamic()
        .setTranslation(layout.crane.spreaderSpawnX, layout.crane.spreaderSpawnY)
        .setLinearDamping(physics.spreader.linearDamping)
        .setAngularDamping(physics.spreader.angularDamping)
        .setCanSleep(false),
    );
    world.createCollider(
      rapier.ColliderDesc.cuboid(
        layout.crane.spreaderHalfWidth,
        layout.crane.spreaderHalfHeight,
      )
        .setDensity(2.2)
        .setFriction(0.4)
        .setRestitution(0.05),
      spreaderBody,
    );

    // Free transport cask (unlocked). Sits in the hold; locking is Phase 3.
    const caskBody = world.createRigidBody(
      rapier.RigidBodyDesc.dynamic()
        .setTranslation(layout.cask.spawnX, layout.cask.spawnY)
        .setLinearDamping(physics.cask.linearDamping)
        .setAngularDamping(physics.cask.angularDamping)
        .setCanSleep(false),
    );
    world.createCollider(
      rapier.ColliderDesc.cuboid(layout.cask.halfWidth, layout.cask.halfHeight)
        .setDensity(3.5)
        .setFriction(0.75)
        .setRestitution(0.02),
      caskBody,
    );

    const stage = new UnloadingScaffoldWorld(
      rapier,
      world,
      quayBody,
      cradleBody,
      shipBody,
      trolleyBody,
      spreaderBody,
      caskBody,
      layout,
      physics,
      lockConfig,
      physicsDtSeconds,
      physicsHz,
      seed,
      trolleyX,
      cableTargetLength,
    );
    stage.lastHeave = initialShip.heave;
    return stage;
  }

  public setControlInput(input: PlayerInput): void {
    this.control = input;
  }

  public getTrolleyX(): number {
    return this.trolleyX;
  }

  public getSpreaderTranslation(): Vec2 {
    const t = this.spreaderBody.translation();
    return { x: t.x, y: t.y };
  }

  public getCableTargetLength(): number {
    return this.cableTargetLength;
  }

  public getCaskTranslation(): Vec2 {
    const t = this.caskBody.translation();
    return { x: t.x, y: t.y };
  }

  public getStagePhase(): StagePhase {
    return this.stage.phase;
  }

  public getAbortReason(): string | null {
    return this.stage.abortReason;
  }

  public isLockReady(): boolean {
    return this.lockReady;
  }

  /** True after Space engaged the spreader–cask fixed joint. */
  public isLockJointActive(): boolean {
    return this.lockJoint !== null && this.lockJoint.isValid();
  }

  /**
   * Place spreader on the cask top face with zero relative velocity.
   * Intended for tests (and debug) so lockReady can be reached without piloting.
   */
  public snapSpreaderToCaskLockPose(): void {
    const cask = this.caskBody.translation();
    const idealY =
      cask.y - this.layout.cask.halfHeight - this.layout.crane.spreaderHalfHeight;
    this.spreaderBody.setTranslation({ x: cask.x, y: idealY }, true);
    this.spreaderBody.setRotation(this.caskBody.rotation(), true);
    this.spreaderBody.setLinvel({ x: 0, y: 0 }, true);
    this.spreaderBody.setAngvel(0, true);
    this.caskBody.setLinvel({ x: 0, y: 0 }, true);
    this.caskBody.setAngvel(0, true);
    // Keep trolley above the cask so cables do not yank the pair sideways.
    this.trolleyX = cask.x;
    this.trolleyVelocity = 0;
    this.trolleyBody.setNextKinematicTranslation({
      x: this.trolleyX,
      y: this.layout.crane.railY,
    });
    this.trolleyBody.setNextKinematicRotation(0);
    const hang = idealY - this.layout.crane.railY;
    this.cableTargetLength = clampCableTargetLength(
      hang,
      this.physics.hoist.minCableLength,
      this.physics.hoist.maxCableLength,
    );
  }

  /**
   * Apply a stage event from physics/input (later commits).
   * Returns whether the transition was accepted.
   */
  public dispatchStageEvent(event: StageMachineEvent): boolean {
    const result = reduceStage(this.stage, event);
    if (result.accepted) {
      this.stage = result.state;
    }
    return result.accepted;
  }

  public step(): void {
    this.tick += 1;
    const elapsedSeconds = this.tick / this.physicsHz;

    const trolley = integrateTrolleyOnRail({
      x: this.trolleyX,
      velocity: this.trolleyVelocity,
      axis: this.control.trolleyAxis,
      dtSeconds: this.physicsDtSeconds,
      maxSpeed: this.physics.trolley.maxSpeed,
      acceleration: this.physics.trolley.acceleration,
      axisDeadzone: this.physics.trolley.axisDeadzone,
      fineMode: this.control.fineMode,
      fineSpeedScale: this.physics.fineMode.speedScale,
      railMinX: this.layout.crane.railMinX,
      railMaxX: this.layout.crane.railMaxX,
      trolleyHalfWidth: this.layout.crane.trolleyHalfWidth,
    });
    this.trolleyX = trolley.x;
    this.trolleyVelocity = trolley.velocity;
    this.trolleyBody.setNextKinematicTranslation({
      x: this.trolleyX,
      y: this.layout.crane.railY,
    });
    this.trolleyBody.setNextKinematicRotation(0);

    // Hoist: change spring rest length (positive axis shortens = lift).
    this.cableTargetLength = integrateCableTargetLength({
      targetLength: this.cableTargetLength,
      axis: this.control.hoistAxis,
      dtSeconds: this.physicsDtSeconds,
      maxSpeed: this.physics.hoist.maxSpeed,
      axisDeadzone: this.physics.trolley.axisDeadzone,
      fineMode: this.control.fineMode,
      fineSpeedScale: this.physics.fineMode.speedScale,
      minCableLength: this.physics.hoist.minCableLength,
      maxCableLength: this.physics.hoist.maxCableLength,
    });

    const pose = sampleBaseShipMotion(
      this.seed,
      elapsedSeconds,
      {
        x: this.layout.ship.restCenterX,
        y: this.layout.ship.restCenterY,
      },
      { highWaveEnvelope: 0 },
    );
    this.lastHeave = pose.heave;
    this.shipBody.setNextKinematicTranslation({ x: pose.x, y: pose.y });
    this.shipBody.setNextKinematicRotation(pose.angleRad);

    this.applyCableForces();

    this.world.timestep = this.physicsDtSeconds;
    this.world.step();

    this.updateLockAlignmentAndPhase();
    this.tryEngageLockFromInput();
  }

  private updateLockAlignmentAndPhase(): void {
    // Only evaluate free-cask lock before LOCKED.
    if (this.stage.phase !== "READY" && this.stage.phase !== "ALIGNING") {
      this.lockReady = false;
      this.alignStableTicks = 0;
      return;
    }

    const spreaderT = this.spreaderBody.translation();
    const spreaderV = this.spreaderBody.linvel();
    const caskT = this.caskBody.translation();
    const caskV = this.caskBody.linvel();

    const alignment = evaluateLockAlignment({
      spreader: {
        x: spreaderT.x,
        y: spreaderT.y,
        angleRad: this.spreaderBody.rotation(),
        vx: spreaderV.x,
        vy: spreaderV.y,
      },
      cask: {
        x: caskT.x,
        y: caskT.y,
        angleRad: this.caskBody.rotation(),
        vx: caskV.x,
        vy: caskV.y,
      },
      spreaderHalfHeight: this.layout.crane.spreaderHalfHeight,
      caskHalfHeight: this.layout.cask.halfHeight,
      config: this.lockConfig,
    });

    if (alignment.ok) {
      this.alignStableTicks += 1;
    } else {
      this.alignStableTicks = 0;
    }

    this.lockReady =
      alignment.ok && this.alignStableTicks >= this.lockConfig.stableAlignTicks;

    if (this.lockReady) {
      this.dispatchStageEvent({ type: "ALIGNMENT_OK" });
    } else if (this.stage.phase === "ALIGNING") {
      this.dispatchStageEvent({ type: "ALIGNMENT_LOST" });
    }
  }

  /**
   * On Space edge: if alignment is stable, create a fixed joint and enter LOCKED.
   */
  private tryEngageLockFromInput(): void {
    if (!this.control.lockPressed) {
      return;
    }
    // One-shot: clear so held/repeated samples in the same input packet do not re-fire.
    this.control = { ...this.control, lockPressed: false };

    if (this.lockJoint !== null) {
      return;
    }
    if (!this.lockReady) {
      return;
    }
    if (this.stage.phase !== "READY" && this.stage.phase !== "ALIGNING") {
      return;
    }

    // Ensure machine is on ALIGNING before LOCK_SUCCESS.
    if (this.stage.phase === "READY") {
      this.dispatchStageEvent({ type: "ALIGNMENT_OK" });
    }

    this.createLockJoint();
    this.dispatchStageEvent({ type: "LOCK_SUCCESS" });
    this.lockReady = false;
    this.alignStableTicks = 0;
  }

  private createLockJoint(): void {
    // Close residual face gap so the joint does not freeze an air pocket.
    this.snapSpreaderToCaskLockPose();

    // Face anchors: spreader bottom center ↔ cask top center (body-local).
    const anchor1: Vec2 = { x: 0, y: this.layout.crane.spreaderHalfHeight };
    const anchor2: Vec2 = { x: 0, y: -this.layout.cask.halfHeight };
    const rot1 = this.spreaderBody.rotation();
    const rot2 = this.caskBody.rotation();
    // Freeze current relative orientation: world frames coincide at creation.
    const frame1 = 0;
    const frame2 = rot1 - rot2;

    const params = this.rapier.JointData.fixed(anchor1, frame1, anchor2, frame2);
    const joint = this.world.createImpulseJoint(
      params,
      this.spreaderBody,
      this.caskBody,
      true,
    );
    joint.setContactsEnabled(false);
    this.lockJoint = joint;
  }

  private applyCableForces(): void {
    this.spreaderBody.resetForces(true);
    this.spreaderBody.resetTorques(true);

    const trolleyVel: Vec2 = { x: this.trolleyVelocity, y: 0 };
    const spanT = this.layout.crane.trolleyCableAttachHalfSpan;
    const spanS = this.layout.crane.spreaderCableAttachHalfSpan;
    // Attach slightly above spreader center so hang looks natural.
    const localAttachY = -this.layout.crane.spreaderHalfHeight * 0.85;

    const sides: Array<{ id: string; sign: number }> = [
      { id: "cable-left", sign: -1 },
      { id: "cable-right", sign: 1 },
    ];

    let totalTension = 0;
    let totalLength = 0;
    const cables: CableRenderState[] = [];

    for (const side of sides) {
      const anchorA: Vec2 = {
        x: this.trolleyX + side.sign * spanT,
        y: this.layout.crane.railY,
      };
      const localX = side.sign * spanS;
      const anchorB = worldPointOnBody(this.spreaderBody, localX, localAttachY);
      const velocityB = worldVelocityOnBody(this.spreaderBody, localX, localAttachY);

      const result = computeCableForce({
        anchorA,
        anchorB,
        velocityA: trolleyVel,
        velocityB,
        targetLength: this.cableTargetLength,
        stiffness: this.physics.cable.stiffness,
        damping: this.physics.cable.damping,
        maxTension: this.physics.cable.maxTension,
      });

      totalTension += result.tension;
      totalLength += result.length;
      if (!result.slack) {
        this.spreaderBody.addForceAtPoint(result.forceOnB, anchorB, true);
      }
      cables.push({
        id: side.id,
        ax: anchorA.x,
        ay: anchorA.y,
        bx: anchorB.x,
        by: anchorB.y,
        tension: result.tension,
      });
    }

    this.lastCableTension = totalTension / sides.length;
    this.lastCableLength = totalLength / sides.length;
    this.lastCables = cables;
  }

  public buildSnapshot(tick: number, generatedAtMs: number): RenderSnapshot {
    const quay = this.quayBody.translation();
    const cradle = this.cradleBody.translation();
    const ship = this.shipBody.translation();
    const trolley = this.trolleyBody.translation();
    const spreader = this.spreaderBody.translation();
    const spreaderVel = this.spreaderBody.linvel();
    const cask = this.caskBody.translation();
    // Lateral offset from trolley is the readable "振れ" for players (not just velocity).
    const lateralSway = Math.abs(spreader.x - this.trolleyX);
    const speedSway = Math.hypot(spreaderVel.x, spreaderVel.y);
    // Prefer measured spring tension; if nearly slack at equilibrium, show stretch load.
    const stretchLoad = Math.max(
      0,
      (this.lastCableLength - this.cableTargetLength) * this.physics.cable.stiffness,
    );
    const cableLoad = Math.max(this.lastCableTension, stretchLoad);

    return {
      tick,
      generatedAtMs,
      stagePhase: this.stage.phase,
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
        {
          id: UnloadingScaffoldWorld.CASK_ID,
          kind: "cask",
          x: cask.x,
          y: cask.y,
          angleRad: this.caskBody.rotation(),
          width: this.layout.cask.halfWidth * 2,
          height: this.layout.cask.halfHeight * 2,
        },
        {
          id: UnloadingScaffoldWorld.TROLLEY_ID,
          kind: "trolley",
          x: trolley.x,
          y: trolley.y,
          angleRad: this.trolleyBody.rotation(),
          width: this.layout.crane.trolleyHalfWidth * 2,
          height: this.layout.crane.trolleyHalfHeight * 2,
        },
        {
          id: UnloadingScaffoldWorld.SPREADER_ID,
          kind: "spreader",
          x: spreader.x,
          y: spreader.y,
          angleRad: this.spreaderBody.rotation(),
          width: this.layout.crane.spreaderHalfWidth * 2,
          height: this.layout.crane.spreaderHalfHeight * 2,
        },
      ],
      cables: this.lastCables,
      instruments: {
        cableLoad,
        // Displacement-dominant so the HUD moves when the load swings.
        sway: lateralSway + speedSway * 0.25,
        lockReady: this.lockReady,
      },
      weather: {
        windHint: 0,
        waveHint: this.lastHeave,
      },
    };
  }

  public free(): void {
    if (this.lockJoint !== null && this.lockJoint.isValid()) {
      this.world.removeImpulseJoint(this.lockJoint, true);
      this.lockJoint = null;
    }
    this.world.free();
  }
}

function worldPointOnBody(
  body: RAPIER.RigidBody,
  localX: number,
  localY: number,
): Vec2 {
  const t = body.translation();
  const angle = body.rotation();
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: t.x + localX * cos - localY * sin,
    y: t.y + localX * sin + localY * cos,
  };
}

function worldVelocityOnBody(
  body: RAPIER.RigidBody,
  localX: number,
  localY: number,
): Vec2 {
  const angle = body.rotation();
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const rx = localX * cos - localY * sin;
  const ry = localX * sin + localY * cos;
  const lv = body.linvel();
  const av = body.angvel();
  return {
    x: lv.x - av * ry,
    y: lv.y + av * rx,
  };
}
