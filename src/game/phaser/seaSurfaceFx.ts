import type Phaser from "phaser";
import {
  worldSizeToDisplay,
  worldToDisplayX,
  worldToDisplayY,
} from "@/game/phaser/worldView";
import {
  DEFAULT_UNLOADING_LAYOUT,
  type UnloadingLayout,
} from "@/game/unloading/layout";

/**
 * Lightweight sea-surface motion (display only — not fluid / not physics).
 */

export interface SeaSurfaceFxConfig {
  /** Number of polyline segments across the berth. */
  segments: number;
  /** Vertical amplitude in game units. */
  amplitude: number;
  /** Primary wave angular rate (rad/s). */
  frequency: number;
  /** Secondary ripple angular rate. */
  rippleFrequency: number;
  /** Secondary ripple amplitude scale (0..1 of amplitude). */
  rippleScale: number;
  /** Horizontal scroll of the phase (units/s). */
  scrollSpeed: number;
}

export const DEFAULT_SEA_SURFACE_FX: SeaSurfaceFxConfig = {
  segments: 48,
  amplitude: 0.08,
  frequency: 1.1,
  rippleFrequency: 2.7,
  rippleScale: 0.35,
  scrollSpeed: 0.55,
};

export interface SeaSurfaceBand {
  leftWorldX: number;
  rightWorldX: number;
  /** Calm waterline Y (game units, Y-down). */
  waterlineWorldY: number;
}

export function seaSurfaceBandFromLayout(
  layout: UnloadingLayout = DEFAULT_UNLOADING_LAYOUT,
): SeaSurfaceBand {
  const waterlineWorldY = layout.quay.centerY + layout.quay.halfHeight;
  return {
    leftWorldX: -22,
    rightWorldX: 22,
    waterlineWorldY,
  };
}

/**
 * Pure: sample a wavy waterline polyline in **display** pixels.
 * Same t + config ⇒ same points (no Math.random).
 */
export function sampleSeaSurfacePolyline(
  tSeconds: number,
  band: SeaSurfaceBand,
  config: SeaSurfaceFxConfig = DEFAULT_SEA_SURFACE_FX,
): ReadonlyArray<{ x: number; y: number }> {
  const points: { x: number; y: number }[] = [];
  const span = band.rightWorldX - band.leftWorldX;
  const n = Math.max(2, config.segments);
  for (let i = 0; i <= n; i += 1) {
    const u = i / n;
    const wx = band.leftWorldX + span * u;
    const phase = wx * 0.65 + tSeconds * config.scrollSpeed;
    const heave =
      Math.sin(tSeconds * config.frequency + phase) * config.amplitude +
      Math.sin(tSeconds * config.rippleFrequency + phase * 1.7) *
        config.amplitude *
        config.rippleScale;
    // Y-down: positive heave dips the surface slightly.
    const wy = band.waterlineWorldY + heave;
    points.push({ x: worldToDisplayX(wx), y: worldToDisplayY(wy) });
  }
  return points;
}

/** Draw animated surface highlight + a few foam dashes. */
export function drawSeaSurfaceFx(
  g: Phaser.GameObjects.Graphics,
  tSeconds: number,
  layout: UnloadingLayout = DEFAULT_UNLOADING_LAYOUT,
  config: SeaSurfaceFxConfig = DEFAULT_SEA_SURFACE_FX,
): void {
  g.clear();
  const band = seaSurfaceBandFromLayout(layout);
  const points = sampleSeaSurfacePolyline(tSeconds, band, config);
  if (points.length < 2) {
    return;
  }

  // Soft fill under the waterline for a moving “skin”.
  const deepY = worldToDisplayY(band.waterlineWorldY + 1.2);
  g.fillStyle(0x1a4a68, 0.22);
  g.beginPath();
  g.moveTo(points[0]!.x, points[0]!.y);
  for (let i = 1; i < points.length; i += 1) {
    g.lineTo(points[i]!.x, points[i]!.y);
  }
  g.lineTo(points[points.length - 1]!.x, deepY);
  g.lineTo(points[0]!.x, deepY);
  g.closePath();
  g.fillPath();

  // Bright surface stroke.
  g.lineStyle(2.5, 0x6ab0d0, 0.75);
  g.beginPath();
  g.moveTo(points[0]!.x, points[0]!.y);
  for (let i = 1; i < points.length; i += 1) {
    g.lineTo(points[i]!.x, points[i]!.y);
  }
  g.strokePath();

  // Sparse foam ticks that crawl with time.
  g.lineStyle(1.5, 0xc8e8f8, 0.35);
  const foamCount = 7;
  for (let f = 0; f < foamCount; f += 1) {
    const u = (f / foamCount + tSeconds * 0.04) % 1;
    const idx = Math.min(points.length - 2, Math.floor(u * (points.length - 1)));
    const p = points[idx]!;
    const len = worldSizeToDisplay(0.35);
    g.beginPath();
    g.moveTo(p.x - len * 0.5, p.y);
    g.lineTo(p.x + len * 0.5, p.y - worldSizeToDisplay(0.04));
    g.strokePath();
  }
}
