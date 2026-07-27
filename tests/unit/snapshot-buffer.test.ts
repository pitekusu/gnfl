import { describe, expect, it } from "vitest";
import type { RenderSnapshot } from "@/game/protocol";
import {
  SnapshotBuffer,
  interpolateSnapshots,
} from "@/game/phaser/snapshotBuffer";

function makeSnapshot(
  tick: number,
  generatedAtMs: number,
  x: number,
  angleRad = 0,
): RenderSnapshot {
  return {
    tick,
    generatedAtMs,
    stagePhase: "READY",
    entities: [
      {
        id: "demo-box",
        kind: "box",
        x,
        y: 0,
        angleRad,
        width: 1,
        height: 1,
      },
    ],
    instruments: { cableLoad: 0, sway: 0 },
    weather: { windHint: 0, waveHint: 0 },
  };
}

describe("interpolateSnapshots", () => {
  it("returns endpoints at alpha 0 and 1", () => {
    const a = makeSnapshot(1, 0, 0);
    const b = makeSnapshot(2, 16, 10);
    expect(interpolateSnapshots(a, b, 0).entities[0]?.x).toBeCloseTo(0);
    expect(interpolateSnapshots(a, b, 1).entities[0]?.x).toBeCloseTo(10);
  });

  it("lerps entity position at mid alpha", () => {
    const a = makeSnapshot(1, 0, 0);
    const b = makeSnapshot(2, 16, 10);
    expect(interpolateSnapshots(a, b, 0.5).entities[0]?.x).toBeCloseTo(5);
  });

  it("takes the shortest path for angles", () => {
    const a = makeSnapshot(1, 0, 0, Math.PI * 0.9);
    const b = makeSnapshot(2, 16, 0, -Math.PI * 0.9);
    const mid = interpolateSnapshots(a, b, 0.5).entities[0]?.angleRad ?? 0;
    // Shortest path crosses ±π, mid should be near ±π, not 0.
    expect(Math.abs(Math.abs(mid) - Math.PI)).toBeLessThan(0.2);
  });
});

describe("SnapshotBuffer", () => {
  it("samples current snapshot when only one exists", () => {
    const buffer = new SnapshotBuffer();
    buffer.push(makeSnapshot(1, 100, 3));
    const sample = buffer.sample(150);
    expect(sample?.snapshot.entities[0]?.x).toBe(3);
    expect(sample?.alpha).toBe(1);
  });

  it("interpolates between previous and current using wall time", () => {
    const buffer = new SnapshotBuffer();
    buffer.push(makeSnapshot(1, 1000, 0));
    buffer.push(makeSnapshot(2, 1020, 20));
    const sample = buffer.sample(1010);
    expect(sample?.snapshot.entities[0]?.x).toBeCloseTo(10);
    expect(sample?.alpha).toBeCloseTo(0.5);
  });

  it("ignores out-of-order ticks", () => {
    const buffer = new SnapshotBuffer();
    buffer.push(makeSnapshot(2, 1000, 20));
    buffer.push(makeSnapshot(1, 1010, 0));
    const sample = buffer.sample(1010);
    expect(sample?.snapshot.tick).toBe(2);
  });
});
