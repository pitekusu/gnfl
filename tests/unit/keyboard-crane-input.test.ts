import { describe, expect, it } from "vitest";
import { mapKeyboardToPlayerInput } from "@/game/input/keyboardCraneInput";

describe("mapKeyboardToPlayerInput", () => {
  it("maps A/D to trolley axis", () => {
    expect(mapKeyboardToPlayerInput(new Set(["KeyA"])).trolleyAxis).toBe(-1);
    expect(mapKeyboardToPlayerInput(new Set(["KeyD"])).trolleyAxis).toBe(1);
    expect(mapKeyboardToPlayerInput(new Set(["ArrowLeft"])).trolleyAxis).toBe(-1);
    expect(mapKeyboardToPlayerInput(new Set(["ArrowRight"])).trolleyAxis).toBe(1);
  });

  it("maps W/S to hoist axis (positive = lift)", () => {
    expect(mapKeyboardToPlayerInput(new Set(["KeyW"])).hoistAxis).toBe(1);
    expect(mapKeyboardToPlayerInput(new Set(["KeyS"])).hoistAxis).toBe(-1);
    expect(mapKeyboardToPlayerInput(new Set(["ArrowUp"])).hoistAxis).toBe(1);
    expect(mapKeyboardToPlayerInput(new Set(["ArrowDown"])).hoistAxis).toBe(-1);
  });

  it("cancels opposing axis keys", () => {
    expect(mapKeyboardToPlayerInput(new Set(["KeyA", "KeyD"])).trolleyAxis).toBe(0);
    expect(mapKeyboardToPlayerInput(new Set(["KeyW", "KeyS"])).hoistAxis).toBe(0);
  });

  it("sets fine mode from Shift", () => {
    expect(mapKeyboardToPlayerInput(new Set(["ShiftLeft"])).fineMode).toBe(true);
    expect(mapKeyboardToPlayerInput(new Set()).fineMode).toBe(false);
  });

  it("passes edge buttons from edge state", () => {
    const input = mapKeyboardToPlayerInput(new Set(), {
      lockPressed: true,
      emergencyStopPressed: true,
      pausePressed: false,
    });
    expect(input.lockPressed).toBe(true);
    expect(input.emergencyStopPressed).toBe(true);
  });
});
