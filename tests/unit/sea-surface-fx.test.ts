import { describe, expect, it } from "vitest";
import {
  DEFAULT_SEA_SURFACE_FX,
  sampleSeaSurfacePolyline,
  seaSurfaceBandFromLayout,
} from "@/game/phaser/seaSurfaceFx";
import { DEFAULT_UNLOADING_LAYOUT } from "@/game/unloading/layout";

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

  it("stays within a small band around the waterline", () => {
    const band = seaSurfaceBandFromLayout(DEFAULT_UNLOADING_LAYOUT);
    const points = sampleSeaSurfacePolyline(0.7, band, {
      ...DEFAULT_SEA_SURFACE_FX,
      amplitude: 0.1,
    });
    const baseY = points.reduce((s, p) => s + p.y, 0) / points.length;
    for (const p of points) {
      expect(Math.abs(p.y - baseY)).toBeLessThan(20);
    }
  });
});
