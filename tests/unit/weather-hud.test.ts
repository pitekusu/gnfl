import { describe, expect, it } from "vitest";
import {
  WIND_HUD_DEADBAND,
  formatWaveHud,
  formatWindHud,
} from "@/game/unloading/weatherHud";

describe("formatWindHud", () => {
  it("shows calm near zero", () => {
    expect(formatWindHud(0)).toBe("弱");
    expect(formatWindHud(WIND_HUD_DEADBAND * 0.5)).toBe("弱");
    expect(formatWindHud(-WIND_HUD_DEADBAND * 0.5)).toBe("弱");
  });

  it("labels left and right from signed hint", () => {
    expect(formatWindHud(-0.42)).toBe("左 0.42");
    expect(formatWindHud(0.75)).toBe("右 0.75");
  });
});

describe("formatWaveHud", () => {
  it("formats signed heave", () => {
    expect(formatWaveHud(0.12)).toBe("+0.12");
    expect(formatWaveHud(-0.35)).toBe("−0.35");
    expect(formatWaveHud(0)).toBe("+0.00");
  });
});
