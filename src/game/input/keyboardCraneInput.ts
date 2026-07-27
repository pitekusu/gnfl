import type { PlayerInput } from "@/game/protocol";
import { createNeutralPlayerInput } from "@/game/protocol";

/**
 * Keyboard key codes used for crane control (Phaser KeyCodes / KeyboardEvent.code).
 * Device keys are mapped here; the worker only sees PlayerInput.
 */
export const CRANE_KEY_CODES = {
  trolleyLeft: ["KeyA", "ArrowLeft"],
  trolleyRight: ["KeyD", "ArrowRight"],
  hoistUp: ["KeyW", "ArrowUp"],
  hoistDown: ["KeyS", "ArrowDown"],
  fineMode: ["ShiftLeft", "ShiftRight"],
  lock: ["Space"],
  emergencyStop: ["KeyE"],
  pause: ["Escape"],
} as const;

export type CraneKeyRole = keyof typeof CRANE_KEY_CODES;

/** Flattened set of all codes that participate in crane control. */
export function allCraneKeyCodes(): ReadonlySet<string> {
  const codes = new Set<string>();
  for (const group of Object.values(CRANE_KEY_CODES)) {
    for (const code of group) {
      codes.add(code);
    }
  }
  return codes;
}

export interface KeyboardEdgeState {
  /** True only on the frame the key transitioned down. */
  lockPressed: boolean;
  emergencyStopPressed: boolean;
  pausePressed: boolean;
}

/**
 * Map currently held keys into a normalized PlayerInput.
 * Axes are mutually exclusive; opposing keys cancel to 0.
 */
export function mapKeyboardToPlayerInput(
  downCodes: ReadonlySet<string>,
  edges: KeyboardEdgeState = {
    lockPressed: false,
    emergencyStopPressed: false,
    pausePressed: false,
  },
): PlayerInput {
  const left = isAnyDown(downCodes, CRANE_KEY_CODES.trolleyLeft);
  const right = isAnyDown(downCodes, CRANE_KEY_CODES.trolleyRight);
  const up = isAnyDown(downCodes, CRANE_KEY_CODES.hoistUp);
  const down = isAnyDown(downCodes, CRANE_KEY_CODES.hoistDown);

  let trolleyAxis = 0;
  if (left && !right) {
    trolleyAxis = -1;
  } else if (right && !left) {
    trolleyAxis = 1;
  }

  let hoistAxis = 0;
  if (up && !down) {
    hoistAxis = 1;
  } else if (down && !up) {
    hoistAxis = -1;
  }

  return {
    ...createNeutralPlayerInput(),
    trolleyAxis,
    hoistAxis,
    fineMode: isAnyDown(downCodes, CRANE_KEY_CODES.fineMode),
    lockPressed: edges.lockPressed,
    emergencyStopPressed: edges.emergencyStopPressed,
  };
}

function isAnyDown(downCodes: ReadonlySet<string>, codes: readonly string[]): boolean {
  return codes.some((code) => downCodes.has(code));
}
