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
import {
  applyUnlockedHoistUpInterlock,
  integrateCableTargetLength,
} from "@/game/unloading/hoistMotion";
import {
  DEFAULT_INTERLOCK_CONFIG,
  type InterlockConfig,
} from "@/game/unloading/interlockConfig";
import { DEFAULT_LOCK_CONFIG, type LockConfig } from "@/game/unloading/lockConfig";
import { evaluateLockAlignment } from "@/game/unloading/lockAlignment";
import { sampleBaseShipMotion } from "@/game/unloading/shipMotion";
import {
  createInitialStageMachineState,
  reduceStage,
  type StageMachineEvent,
  type StageMachineState,
} from "@/game/unloading/stageMachine";
import { evaluateCradleSeating } from "@/game/unloading/cradleSeating";
import {
  cradleTopY,
  isCaskClearOfHold,
  isOverCradleZone,
} from "@/game/unloading/stageThresholds";
import {
  applyAxisDeadzone,
  integrateTrolleyOnRail,
} from "@/game/unloading/trolleyMotion";

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
  private readonly interlock: InterlockConfig;
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
  /** Explicit lock flag for HUD/snapshots (do not rely only on joint.isValid()). */
  private caskLocked = false;
  private lockJoint: RAPIER.ImpulseJoint | null = null;
  /** Cask world Y captured when the lock joint engaged (for breakout lift). */
  private lockEngageCaskY: number | null = null;
  private seatStableTicks = 0;

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
    interlock: InterlockConfig,
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
    this.interlock = interlock;
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
    interlock: InterlockConfig = DEFAULT_INTERLOCK_CONFIG,
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

    // Water-side bumper (drawn in scenery — must match these local offsets).
    world.createCollider(
      rapier.ColliderDesc.cuboid(
        layout.quay.bumperHalfWidth,
        layout.quay.bumperHalfHeight,
      )
        .setTranslation(
          -layout.quay.halfWidth + layout.quay.bumperHalfWidth,
          -layout.quay.halfHeight - layout.quay.bumperHalfHeight,
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
    // U-cradle: pad + left/right posts (all must be drawn to match).
    world.createCollider(
      rapier.ColliderDesc.cuboid(
        layout.cradle.halfWidth,
        layout.cradle.halfHeight,
      ).setFriction(0.95),
      cradleBody,
    );
    const postLocalY = -layout.cradle.halfHeight - layout.cradle.postHalfHeight;
    const postInsetX = layout.cradle.halfWidth - layout.cradle.postHalfWidth;
    world.createCollider(
      rapier.ColliderDesc.cuboid(
        layout.cradle.postHalfWidth,
        layout.cradle.postHalfHeight,
      )
        .setTranslation(-postInsetX, postLocalY)
        .setFriction(0.95),
      cradleBody,
    );
    world.createCollider(
      rapier.ColliderDesc.cuboid(
        layout.cradle.postHalfWidth,
        layout.cradle.postHalfHeight,
      )
        .setTranslation(postInsetX, postLocalY)
        .setFriction(0.95),
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
      rapier.ColliderDesc.cuboid(
        layout.ship.holdHalfWidth,
        layout.ship.holdFloorHalfHeight,
      )
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
      interlock,
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
    return this.caskLocked;
  }

  /**
   * Place locked load onto the cradle pad with zero velocity (tests / debug).
   * Keeps trolley above the cradle so seating checks can pass without long settle.
   */
  public snapLoadOntoCradlePad(): void {
    const top = cradleTopY(this.layout);
    // Cask bottom on cradle top: bottom = y + halfH = top ⇒ y = top - halfH.
    const caskY = top - this.layout.cask.halfHeight;
    const caskX = this.layout.cradle.centerX;
    this.trolleyX = caskX;
    this.trolleyVelocity = 0;
    this.trolleyBody.setNextKinematicTranslation({
      x: this.trolleyX,
      y: this.layout.crane.railY,
    });
    this.trolleyBody.setNextKinematicRotation(0);

    this.caskBody.setTranslation({ x: caskX, y: caskY }, true);
    this.caskBody.setRotation(0, true);
    this.caskBody.setLinvel({ x: 0, y: 0 }, true);
    this.caskBody.setAngvel(0, true);

    const spreaderY =
      caskY - this.layout.cask.halfHeight - this.layout.crane.spreaderHalfHeight;
    this.spreaderBody.setTranslation({ x: caskX, y: spreaderY }, true);
    this.spreaderBody.setRotation(0, true);
    this.spreaderBody.setLinvel({ x: 0, y: 0 }, true);
    this.spreaderBody.setAngvel(0, true);

    const hang = spreaderY - this.layout.crane.railY;
    this.cableTargetLength = clampCableTargetLength(
      hang,
      this.physics.hoist.minCableLength,
      this.physics.hoist.maxCableLength,
    );
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
    const terminal =
      this.stage.phase === "COMPLETED" || this.stage.phase === "SAFE_ABORTED";

    // Freeze player control after complete / safe abort.
    const trolleyAxis = terminal ? 0 : this.control.trolleyAxis;
    const hoistInput = terminal ? 0 : this.control.hoistAxis;

    // Low-clearance trolley limit while a locked load is still inside the hold.
    const shipY = this.shipBody.translation().y;
    const caskY = this.caskBody.translation().y;
    const carryingLowInHold =
      this.isLockJointActive() &&
      !isCaskClearOfHold(caskY, shipY, this.layout, this.interlock);
    const trolleyMaxSpeed =
      this.physics.trolley.maxSpeed *
      (carryingLowInHold ? this.interlock.lowClearanceTrolleySpeedScale : 1);

    const trolley = integrateTrolleyOnRail({
      x: this.trolleyX,
      velocity: this.trolleyVelocity,
      axis: trolleyAxis,
      dtSeconds: this.physicsDtSeconds,
      maxSpeed: trolleyMaxSpeed,
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
    // Unlocked hoist-up uses interlock scale (default 1 = can reel cable back).
    let hoistAxis = applyUnlockedHoistUpInterlock(
      hoistInput,
      this.isLockJointActive(),
      this.interlock.unlockedHoistUpSpeedScale,
    );
    // Extreme tension: cut hoist-up (interlock, not score yet).
    if (hoistAxis > 0 && this.lastCableTension > this.interlock.maxHoistTension) {
      hoistAxis = 0;
    }
    this.cableTargetLength = integrateCableTargetLength({
      targetLength: this.cableTargetLength,
      axis: hoistAxis,
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

    if (!terminal) {
      this.updateLockAlignmentAndPhase();
      this.tryLockOrUnlockFromInput();
      this.updateBreakoutLiftPhase();
      this.updateClearOfHoldPhase();
      this.updateTraverseAndCradlePhase();
      this.updateSeatingPhase();
      this.updateSafetyAbort();
    }
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
   * Space edge:
   * - While locked (any phase): release joint → READY (re-lock allowed later)
   * - READY/ALIGNING + lockReady: engage joint → LOCKED
   */
  private tryLockOrUnlockFromInput(): void {
    if (!this.control.lockPressed) {
      return;
    }
    // One-shot: clear so held/repeated samples in the same input packet do not re-fire.
    this.control = { ...this.control, lockPressed: false };

    if (this.caskLocked) {
      // On SEATED, unlock completes the careful-placement path.
      // Otherwise unlock returns to READY for re-lock.
      this.releaseLockJoint();
      this.dispatchStageEvent({ type: "UNLOCK_CONFIRMED" });
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
    this.caskLocked = true;
    this.lockEngageCaskY = this.caskBody.translation().y;
    this.dispatchStageEvent({ type: "LOCK_SUCCESS" });
    this.lockReady = false;
    this.alignStableTicks = 0;
  }

  private releaseLockJoint(): void {
    if (this.lockJoint !== null && this.lockJoint.isValid()) {
      this.world.removeImpulseJoint(this.lockJoint, true);
    }
    this.lockJoint = null;
    this.caskLocked = false;
    this.lockEngageCaskY = null;
    this.seatStableTicks = 0;
  }

  /**
   * After lock, hoist-up that lifts the cask off its engage height → LIFTING.
   */
  private updateBreakoutLiftPhase(): void {
    if (this.stage.phase !== "LOCKED") {
      return;
    }
    if (this.lockEngageCaskY === null) {
      return;
    }
    const caskY = this.caskBody.translation().y;
    // Y-down: lift decreases world Y.
    const lifted = this.lockEngageCaskY - caskY;
    if (lifted >= this.interlock.breakoutLiftDistance) {
      this.dispatchStageEvent({ type: "BREAKOUT_LIFT" });
    }
  }

  /**
   * While LIFTING, clear the hold mouth height → CLEAR_OF_HOLD.
   */
  private updateClearOfHoldPhase(): void {
    if (this.stage.phase !== "LIFTING") {
      return;
    }
    const shipY = this.shipBody.translation().y;
    const caskY = this.caskBody.translation().y;
    if (isCaskClearOfHold(caskY, shipY, this.layout, this.interlock)) {
      this.dispatchStageEvent({ type: "CLEARED_HOLD" });
    }
  }

  /**
   * CLEAR_OF_HOLD → TRAVERSING on trolley command;
   * TRAVERSING / CLEAR_OF_HOLD → LANDING when over cradle;
   * LANDING → TRAVERSING if the load leaves the cradle band.
   *
   * "Over cradle" uses trolley X (crane position) so swinging load lag
   * does not miss the landing band during traverse.
   */
  private updateTraverseAndCradlePhase(): void {
    const overCradle = isOverCradleZone(this.trolleyX, this.layout);
    const trolleyDrive = applyAxisDeadzone(
      this.control.trolleyAxis,
      this.physics.trolley.axisDeadzone,
    );

    if (this.stage.phase === "CLEAR_OF_HOLD") {
      if (overCradle) {
        this.dispatchStageEvent({ type: "OVER_CRADLE" });
        return;
      }
      if (Math.abs(trolleyDrive) > 0) {
        this.dispatchStageEvent({ type: "BEGIN_TRAVERSE" });
      }
      return;
    }

    if (this.stage.phase === "TRAVERSING") {
      if (overCradle) {
        this.dispatchStageEvent({ type: "OVER_CRADLE" });
      }
      return;
    }

    if (this.stage.phase === "LANDING") {
      if (!overCradle) {
        this.seatStableTicks = 0;
        this.dispatchStageEvent({ type: "BEGIN_TRAVERSE" });
      }
    }
  }

  /**
   * Stable cradle seating:
   * - Free / dropped load (unlocked): SEATED → COMPLETED automatically.
   * - Locked careful placement: SEATED only; COMPLETED on Space unlock.
   */
  private updateSeatingPhase(): void {
    if (this.stage.phase === "COMPLETED" || this.stage.phase === "SAFE_ABORTED") {
      this.seatStableTicks = 0;
      return;
    }

    // Locked placement waiting for unlock — allow leave-seat if re-hoisted.
    if (this.stage.phase === "SEATED") {
      if (this.caskLocked) {
        this.updateSeatedLeaveChecks();
      }
      // Unlocked SEATED should not linger (free-drop path completes same frame).
      return;
    }

    const caskX = this.caskBody.translation().x;
    // Use cask position so a free drop into the pad counts (not only trolley X).
    if (!isOverCradleZone(caskX, this.layout)) {
      this.seatStableTicks = 0;
      return;
    }

    const seating = this.evaluateCurrentCradleSeating();
    if (seating.ok) {
      this.seatStableTicks += 1;
    } else {
      this.seatStableTicks = 0;
      return;
    }

    if (this.seatStableTicks >= this.interlock.seatStableTicks) {
      this.seatStableTicks = 0;
      this.dispatchStageEvent({ type: "SEAT_STABLE" });
      // Drop / free seating completes immediately; locked seating waits for unlock.
      if (!this.caskLocked) {
        this.dispatchStageEvent({ type: "COMPLETE_CONFIRMED" });
      }
    }
  }

  private updateSeatedLeaveChecks(): void {
    const overCradle = isOverCradleZone(this.trolleyX, this.layout);
    if (!overCradle) {
      this.dispatchStageEvent({ type: "BEGIN_TRAVERSE" });
      return;
    }
    const seating = this.evaluateCurrentCradleSeating();
    if (seating.gapAboveCradle > this.interlock.seatMaxVerticalError) {
      this.dispatchStageEvent({ type: "SEAT_LOST" });
    }
  }

  private evaluateCurrentCradleSeating() {
    const caskT = this.caskBody.translation();
    const caskV = this.caskBody.linvel();
    return evaluateCradleSeating({
      cask: {
        x: caskT.x,
        y: caskT.y,
        angleRad: this.caskBody.rotation(),
        vx: caskV.x,
        vy: caskV.y,
      },
      caskHalfHeight: this.layout.cask.halfHeight,
      cradleCenterX: this.layout.cradle.centerX,
      cradleTopY: cradleTopY(this.layout),
      interlock: this.interlock,
    });
  }

  /**
   * E-stop, world-bounds escape, and physics runaway → SAFE_ABORTED.
   */
  private updateSafetyAbort(): void {
    if (this.stage.phase === "COMPLETED" || this.stage.phase === "SAFE_ABORTED") {
      return;
    }

    if (this.control.emergencyStopPressed) {
      this.control = { ...this.control, emergencyStopPressed: false };
      this.dispatchStageEvent({ type: "SAFE_ABORT", reason: "E_STOP" });
      this.trolleyVelocity = 0;
      return;
    }

    const bounds = this.interlock.worldBounds;
    const bodies = [
      { name: "spreader", body: this.spreaderBody },
      { name: "cask", body: this.caskBody },
    ] as const;
    for (const { name, body } of bodies) {
      const t = body.translation();
      const v = body.linvel();
      const speed = Math.hypot(v.x, v.y);
      if (speed > this.interlock.maxBodySpeed) {
        this.dispatchStageEvent({
          type: "SAFE_ABORT",
          reason: `RUNAWAY_${name.toUpperCase()}`,
        });
        this.trolleyVelocity = 0;
        return;
      }
      if (
        t.x < bounds.minX ||
        t.x > bounds.maxX ||
        t.y < bounds.minY ||
        t.y > bounds.maxY
      ) {
        this.dispatchStageEvent({
          type: "SAFE_ABORT",
          reason: `OUT_OF_BOUNDS_${name.toUpperCase()}`,
        });
        this.trolleyVelocity = 0;
        return;
      }
    }
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
      abortReason: this.stage.abortReason,
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
        locked: this.caskLocked,
      },
      weather: {
        windHint: 0,
        waveHint: this.lastHeave,
      },
    };
  }

  public free(): void {
    this.releaseLockJoint();
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
