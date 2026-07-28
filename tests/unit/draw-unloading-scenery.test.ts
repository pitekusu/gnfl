import { describe, expect, it, vi } from "vitest";
import {
  drawDynamicUnloadingOverlays,
  drawStaticUnloadingScenery,
} from "@/game/phaser/drawUnloadingScenery";
import type { RenderSnapshot } from "@/game/protocol";
import { DEFAULT_UNLOADING_LAYOUT } from "@/game/unloading/layout";

function mockGraphics() {
  return {
    clear: vi.fn(),
    fillStyle: vi.fn(),
    fillRect: vi.fn(),
    lineStyle: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    strokePath: vi.fn(),
  };
}

describe("drawUnloadingScenery", () => {
  it("draws static rail and water without throwing", () => {
    const g = mockGraphics();
    drawStaticUnloadingScenery(g as never);
    expect(g.clear).toHaveBeenCalled();
    expect(g.fillRect).toHaveBeenCalled();
    expect(g.strokePath).toHaveBeenCalled();
  });

  it("draws hold floor when a ship entity is present", () => {
    const g = mockGraphics();
    const snapshot: RenderSnapshot = {
      tick: 1,
      generatedAtMs: 0,
      stagePhase: "READY",
      entities: [
        {
          id: "ship",
          kind: "ship",
          x: DEFAULT_UNLOADING_LAYOUT.ship.restCenterX,
          y: DEFAULT_UNLOADING_LAYOUT.ship.restCenterY,
          angleRad: 0,
          width: 1,
          height: 1,
        },
      ],
      cables: [],
      instruments: { cableLoad: 0, sway: 0, lockReady: false },
      weather: { windHint: 0, waveHint: 0 },
    };
    drawDynamicUnloadingOverlays(g as never, snapshot);
    expect(g.strokePath).toHaveBeenCalled();
  });
});
