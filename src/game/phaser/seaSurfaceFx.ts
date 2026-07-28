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
 * Rich sea-surface motion (display only — not fluid / not physics).
 * Prefer fidelity over CPU; suitable for desktop targets.
 */

export interface SeaSurfaceFxConfig {
  /** Horizontal samples across the berth (higher = smoother crests). */
  segments: number;
  /** Primary swell amplitude (game units). */
  amplitude: number;
  /** Primary swell angular rate (rad/s). */
  frequency: number;
  /** Secondary chop angular rate. */
  rippleFrequency: number;
  /** Chop amplitude as fraction of {@link amplitude}. */
  rippleScale: number;
  /** Tertiary micro-ripple rate. */
  microFrequency: number;
  /** Micro-ripple scale vs amplitude. */
  microScale: number;
  /** Horizontal phase scroll (world units/s). */
  scrollSpeed: number;
  /** How many stacked depth skins under the surface. */
  depthLayers: number;
  /** Depth of the deepest animated skin (game units below waterline). */
  bodyDepth: number;
  /** Foam particle count. */
  foamCount: number;
  /** Specular spark count on crests. */
  sparkCount: number;
  /** Vertical caustic stripe count. */
  causticCount: number;
  /** Spray bursts when |slope| is high. */
  sprayCount: number;
}

/** High-fidelity desktop defaults (CPU-heavy on purpose). */
export const DEFAULT_SEA_SURFACE_FX: SeaSurfaceFxConfig = {
  segments: 160,
  amplitude: 0.14,
  frequency: 0.95,
  rippleFrequency: 2.35,
  rippleScale: 0.42,
  microFrequency: 5.8,
  microScale: 0.18,
  scrollSpeed: 0.72,
  depthLayers: 7,
  bodyDepth: 2.4,
  foamCount: 96,
  sparkCount: 48,
  causticCount: 36,
  sprayCount: 28,
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
    leftWorldX: -24,
    rightWorldX: 24,
    waterlineWorldY,
  };
}

/** Deterministic 0..1 from a seed (no Math.random). */
export function hash01(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
}

export function sampleSurfaceHeaveWorld(
  wx: number,
  tSeconds: number,
  config: SeaSurfaceFxConfig = DEFAULT_SEA_SURFACE_FX,
): number {
  const phase = wx * 0.55 + tSeconds * config.scrollSpeed;
  return (
    Math.sin(tSeconds * config.frequency + phase) * config.amplitude +
    Math.sin(tSeconds * config.rippleFrequency + phase * 1.85) *
      config.amplitude *
      config.rippleScale +
    Math.sin(tSeconds * config.microFrequency + phase * 3.4 + wx * 0.2) *
      config.amplitude *
      config.microScale
  );
}

/**
 * Pure: sample a wavy waterline polyline in **display** pixels.
 * Same t + config ⇒ same points.
 */
export function sampleSeaSurfacePolyline(
  tSeconds: number,
  band: SeaSurfaceBand,
  config: SeaSurfaceFxConfig = DEFAULT_SEA_SURFACE_FX,
): ReadonlyArray<{ x: number; y: number; wy: number; slope: number }> {
  const points: { x: number; y: number; wy: number; slope: number }[] = [];
  const span = band.rightWorldX - band.leftWorldX;
  const n = Math.max(2, config.segments);
  const dx = span / n;
  for (let i = 0; i <= n; i += 1) {
    const wx = band.leftWorldX + dx * i;
    const heave = sampleSurfaceHeaveWorld(wx, tSeconds, config);
    const heaveR = sampleSurfaceHeaveWorld(wx + dx * 0.5, tSeconds, config);
    const slope = (heaveR - heave) / (dx * 0.5);
    const wy = band.waterlineWorldY + heave;
    points.push({
      x: worldToDisplayX(wx),
      y: worldToDisplayY(wy),
      wy,
      slope,
    });
  }
  return points;
}

function strokePolyline(
  g: Phaser.GameObjects.Graphics,
  points: ReadonlyArray<{ x: number; y: number }>,
  color: number,
  alpha: number,
  width: number,
  yOffset = 0,
): void {
  if (points.length < 2) {
    return;
  }
  g.lineStyle(width, color, alpha);
  g.beginPath();
  g.moveTo(points[0]!.x, points[0]!.y + yOffset);
  for (let i = 1; i < points.length; i += 1) {
    g.lineTo(points[i]!.x, points[i]!.y + yOffset);
  }
  g.strokePath();
}

function fillSkinUnderPolyline(
  g: Phaser.GameObjects.Graphics,
  points: ReadonlyArray<{ x: number; y: number }>,
  bottomY: number,
  color: number,
  alpha: number,
): void {
  if (points.length < 2) {
    return;
  }
  g.fillStyle(color, alpha);
  g.beginPath();
  g.moveTo(points[0]!.x, points[0]!.y);
  for (let i = 1; i < points.length; i += 1) {
    g.lineTo(points[i]!.x, points[i]!.y);
  }
  g.lineTo(points[points.length - 1]!.x, bottomY);
  g.lineTo(points[0]!.x, bottomY);
  g.closePath();
  g.fillPath();
}

/**
 * Draw multi-layer sea body, caustics, foam, sparks, and spray.
 * Expects to be called every frame; clears the graphics object.
 */
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

  const deepBottom = worldToDisplayY(band.waterlineWorldY + config.bodyDepth);

  // --- Deep body gradient via stacked skins ---
  for (let layer = config.depthLayers; layer >= 1; layer -= 1) {
    const u = layer / config.depthLayers;
    const depthWorld = config.bodyDepth * u;
    const bottomY = worldToDisplayY(band.waterlineWorldY + depthWorld);
    // Darker with depth; slight teal toward surface.
    const r = Math.floor(8 + (1 - u) * 28);
    const gch = Math.floor(28 + (1 - u) * 55);
    const b = Math.floor(48 + (1 - u) * 70);
    const color = (r << 16) | (gch << 8) | b;
    const alpha = 0.12 + (1 - u) * 0.16;
    // Offset skin slightly so layers separate.
    const yBias = worldSizeToDisplay(0.02 * layer);
    const layered = points.map((p) => ({
      x: p.x,
      y: p.y + yBias * 0.15 * Math.sin(tSeconds * 0.7 + p.x * 0.01),
    }));
    fillSkinUnderPolyline(g, layered, bottomY, color, alpha);
  }

  // Base body under the main surface.
  fillSkinUnderPolyline(g, points, deepBottom, 0x0a2840, 0.35);

  // --- Subsurface caustic shafts ---
  for (let c = 0; c < config.causticCount; c += 1) {
    const seed = c * 17.13 + 3.1;
    const u = (hash01(seed) + tSeconds * (0.03 + hash01(seed + 1) * 0.04)) % 1;
    const idx = Math.min(points.length - 1, Math.floor(u * (points.length - 1)));
    const p = points[idx]!;
    const sway = Math.sin(tSeconds * 1.4 + seed) * worldSizeToDisplay(0.12);
    const topY = p.y + worldSizeToDisplay(0.05);
    const botY = deepBottom - worldSizeToDisplay(0.2);
    const halfW = worldSizeToDisplay(0.08 + hash01(seed + 2) * 0.18);
    g.fillStyle(0x7ec8e8, 0.04 + hash01(seed + 3) * 0.05);
    g.beginPath();
    g.moveTo(p.x - halfW + sway, topY);
    g.lineTo(p.x + halfW + sway, topY);
    g.lineTo(p.x + halfW * 0.35 + sway * 0.5, botY);
    g.lineTo(p.x - halfW * 0.35 + sway * 0.5, botY);
    g.closePath();
    g.fillPath();
  }

  // --- Secondary ghost surfaces (parallax wave trains) ---
  for (const train of [
    { delay: 0.35, amp: 0.55, alpha: 0.28, color: 0x3a7a98 },
    { delay: 0.7, amp: 0.35, alpha: 0.18, color: 0x2a6080 },
  ] as const) {
    const ghost = sampleSeaSurfacePolyline(tSeconds + train.delay, band, {
      ...config,
      amplitude: config.amplitude * train.amp,
      scrollSpeed: config.scrollSpeed * (0.85 + train.delay * 0.2),
    });
    strokePolyline(
      g,
      ghost,
      train.color,
      train.alpha,
      1.5,
      worldSizeToDisplay(0.06 * train.delay),
    );
  }

  // --- Main surface rim (double stroke) ---
  strokePolyline(g, points, 0x1a4058, 0.55, 5);
  strokePolyline(g, points, 0x8fd0f0, 0.85, 2.4);
  strokePolyline(g, points, 0xe8f8ff, 0.35, 1.1, -worldSizeToDisplay(0.02));

  // --- Crest specular sparks ---
  for (let s = 0; s < config.sparkCount; s += 1) {
    const seed = s * 9.91 + 0.4;
    const u = (hash01(seed) + tSeconds * 0.07) % 1;
    const idx = Math.min(
      points.length - 2,
      Math.max(1, Math.floor(u * (points.length - 2))),
    );
    const p = points[idx]!;
    // Prefer crests (local min y in display = higher in world for Y-down wait: smaller y is up)
    const left = points[idx - 1]!;
    const right = points[idx + 1]!;
    const isCrest = p.y <= left.y && p.y <= right.y;
    if (!isCrest && hash01(seed + 5) > 0.35) {
      continue;
    }
    const life = 0.45 + hash01(seed + 6) * 0.55;
    const pulse = 0.5 + 0.5 * Math.sin(tSeconds * 8 + seed);
    const r = worldSizeToDisplay(0.04 + hash01(seed + 7) * 0.06);
    g.fillStyle(0xf5fcff, 0.25 * life * pulse);
    g.fillCircle(p.x, p.y - worldSizeToDisplay(0.03), r);
    g.fillStyle(0xffffff, 0.15 * pulse);
    g.fillCircle(p.x, p.y - worldSizeToDisplay(0.03), r * 0.45);
  }

  // --- Foam streaks ---
  for (let f = 0; f < config.foamCount; f += 1) {
    const seed = f * 13.37 + 2.2;
    const drift = tSeconds * (0.05 + hash01(seed) * 0.08);
    const u = (hash01(seed + 1) + drift) % 1;
    const idx = Math.min(points.length - 2, Math.floor(u * (points.length - 1)));
    const p = points[idx]!;
    const len = worldSizeToDisplay(0.2 + hash01(seed + 2) * 0.55);
    const lift = worldSizeToDisplay(0.01 + hash01(seed + 3) * 0.05);
    const ang = (hash01(seed + 4) - 0.5) * 0.6;
    const cos = Math.cos(ang);
    const sin = Math.sin(ang);
    g.lineStyle(1.2 + hash01(seed + 8) * 1.4, 0xd8f0fa, 0.2 + hash01(seed + 9) * 0.35);
    g.beginPath();
    g.moveTo(p.x - cos * len * 0.5, p.y - lift - sin * len * 0.5);
    g.lineTo(p.x + cos * len * 0.5, p.y - lift + sin * len * 0.5);
    g.strokePath();
  }

  // --- Spray near steep slopes ---
  for (let s = 0; s < config.sprayCount; s += 1) {
    const seed = s * 21.7 + 8.8;
    const u = (hash01(seed) + tSeconds * 0.11) % 1;
    const idx = Math.min(
      points.length - 2,
      Math.max(1, Math.floor(u * (points.length - 2))),
    );
    const p = points[idx]!;
    if (Math.abs(p.slope) < 0.35 && hash01(seed + 2) > 0.25) {
      continue;
    }
    const droplets = 3 + Math.floor(hash01(seed + 3) * 4);
    for (let d = 0; d < droplets; d += 1) {
      const ds = seed + d * 0.37;
      const age = (hash01(ds) + tSeconds * (1.2 + hash01(ds + 1))) % 1;
      const up = worldSizeToDisplay(0.05 + age * 0.35);
      const side =
        Math.sign(p.slope || 1) *
        worldSizeToDisplay((hash01(ds + 2) - 0.3) * 0.25 * age);
      const rr = worldSizeToDisplay(0.02 + (1 - age) * 0.035);
      g.fillStyle(0xe0f4ff, 0.15 * (1 - age));
      g.fillCircle(p.x + side, p.y - up, rr);
    }
  }
}
