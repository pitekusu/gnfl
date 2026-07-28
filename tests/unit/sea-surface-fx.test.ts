import { describe, expect, it } from "vitest";
import {
  DEFAULT_SEA_SURFACE_FX,
  hash01,
  sampleSeaSurfacePolyline,
  sampleSurfaceHeaveWorld,
  seaSurfaceBandFromLayout,
} from "@/game/phaser/seaSurfaceFx";
import { DEFAULT_UNLOADING_LAYOUT } from "@/game/unloading/layout";

describe("hash01", () => {
  it("is deterministic and in [0,1)", () => {
    expect(hash01(1)).toBe(hash01(1));
    expect(hash01(1)).not.toBe(hash01(2));
    for (let i = 0; i < 50; i += 1) {
      const h = hash01(i * 1.7);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThan(1);
    }
  });
});

describe("sampleSeaSurfacePolyline", () => {
  it("is deterministic for the same time", () => {
    const band = seaSurfaceBandFromLayout(DEFAULT_UNLOADING_LAYOUT);
    const a = sampleSeaSurfacePolyline(3.25, band);
    const b = sampleSeaSurfacePolyline(3.25, band);
    expect(a).toEqual(b);
    expect(a.length).toBe(DEFAULT_SEA_SURFACE_FX.segments + 1);
  });

  it("moves over time", () => {
    const band = seaSurfaceBandFromLayout(DEFAULT_UNLOADING_LAYOUT);
    const a = sampleSeaSurfacePolyline(0, band);
    const b = sampleSeaSurfacePolyline(1.5, band);
    const mid = Math.floor(a.length / 2);
    expect(a[mid]?.y).not.toBe(b[mid]?.y);
  });

  it("includes multi-harmonic heave", () => {
    const h0 = sampleSurfaceHeaveWorld(0, 0);
    const h1 = sampleSurfaceHeaveWorld(1.5, 0.8);
    expect(Number.isFinite(h0)).toBe(true);
    expect(h0).not.toBe(h1);
  });

  it("stays within a bounded band around the mean surface", () => {
    const band = seaSurfaceBandFromLayout(DEFAULT_UNLOADING_LAYOUT);
    const points = sampleSeaSurfacePolyline(0.7, band);
    const baseY = points.reduce((s, p) => s + p.y, 0) / points.length;
    for (const p of points) {
      expect(Math.abs(p.y - baseY)).toBeLessThan(40);
    }
  });
});
