import { describe, expect, it } from "vitest";
import { visibilityToSimulationAction } from "@/game/phaser/visibilityControl";

describe("visibilityToSimulationAction", () => {
  it("pauses when the document is hidden", () => {
    expect(visibilityToSimulationAction("hidden")).toBe("PAUSE");
  });

  it("resumes when the document is visible", () => {
    expect(visibilityToSimulationAction("visible")).toBe("RESUME");
  });
});
