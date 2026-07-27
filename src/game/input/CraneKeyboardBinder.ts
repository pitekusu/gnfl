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
  private bound = false;

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (!this.relevantCodes.has(event.code)) {
      return;
    }
    // Prevent page scroll on arrows / space while playing.
    event.preventDefault();
    if (this.downCodes.has(event.code)) {
      return;
    }
    this.downCodes.add(event.code);
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
    return {
      input: mapKeyboardToPlayerInput(this.downCodes, edges),
      pausePressed: edges.pausePressed,
    };
  }
}
