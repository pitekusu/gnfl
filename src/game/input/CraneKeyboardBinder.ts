import {
  CRANE_KEY_CODES,
  allCraneKeyCodes,
  mapKeyboardToPlayerInput,
  type KeyboardEdgeState,
} from "@/game/input/keyboardCraneInput";
import type { PlayerInput } from "@/game/protocol";

/**
 * Tracks keydown/keyup for crane controls and builds PlayerInput each frame.
 * Uses KeyboardEvent.code (layout-independent physical keys).
 */
export class CraneKeyboardBinder {
  private readonly downCodes = new Set<string>();
  private readonly relevantCodes = allCraneKeyCodes();
  private lockEdge = false;
  private emergencyEdge = false;
  private pauseEdge = false;
  private shiftHeld = false;
  private bound = false;

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    // Shift: track via both code and key — some browsers are flaky with only one.
    if (
      event.key === "Shift" ||
      event.code === "ShiftLeft" ||
      event.code === "ShiftRight"
    ) {
      this.shiftHeld = true;
      this.downCodes.add(event.code.startsWith("Shift") ? event.code : "ShiftLeft");
    }

    if (!this.relevantCodes.has(event.code) && event.key !== "Shift") {
      return;
    }
    // Prevent page scroll on arrows / space while playing.
    if (this.relevantCodes.has(event.code)) {
      event.preventDefault();
    }
    if (this.downCodes.has(event.code)) {
      // Still allow shift tracking above; ignore repeat for edges.
      if (event.repeat) {
        return;
      }
    } else if (this.relevantCodes.has(event.code)) {
      this.downCodes.add(event.code);
    }

    if ((CRANE_KEY_CODES.lock as readonly string[]).includes(event.code)) {
      this.lockEdge = true;
    }
    if ((CRANE_KEY_CODES.emergencyStop as readonly string[]).includes(event.code)) {
      this.emergencyEdge = true;
    }
    if ((CRANE_KEY_CODES.pause as readonly string[]).includes(event.code)) {
      this.pauseEdge = true;
    }
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    if (
      event.key === "Shift" ||
      event.code === "ShiftLeft" ||
      event.code === "ShiftRight"
    ) {
      this.shiftHeld = false;
      this.downCodes.delete("ShiftLeft");
      this.downCodes.delete("ShiftRight");
    }
    if (!this.relevantCodes.has(event.code)) {
      return;
    }
    this.downCodes.delete(event.code);
  };

  public attach(target: Window = window): void {
    if (this.bound) {
      return;
    }
    target.addEventListener("keydown", this.onKeyDown);
    target.addEventListener("keyup", this.onKeyUp);
    this.bound = true;
  }

  public detach(target: Window = window): void {
    if (!this.bound) {
      return;
    }
    target.removeEventListener("keydown", this.onKeyDown);
    target.removeEventListener("keyup", this.onKeyUp);
    this.bound = false;
    this.downCodes.clear();
  }

  /**
   * Sample current axes and consume one-shot edges (lock / E-stop / pause).
   */
  public sample(): { input: PlayerInput; pausePressed: boolean } {
    const edges: KeyboardEdgeState = {
      lockPressed: this.lockEdge,
      emergencyStopPressed: this.emergencyEdge,
      pausePressed: this.pauseEdge,
    };
    this.lockEdge = false;
    this.emergencyEdge = false;
    this.pauseEdge = false;
    const input = mapKeyboardToPlayerInput(this.downCodes, edges);
    if (this.shiftHeld) {
      input.fineMode = true;
    }
    return {
      input,
      pausePressed: edges.pausePressed,
    };
  }
}
