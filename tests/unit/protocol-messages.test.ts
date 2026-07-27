import { describe, expect, it } from "vitest";
import {
  DEFAULT_SIMULATION_CONFIG,
  PROTOCOL_VERSION,
  createEmptyRenderSnapshot,
  isMainToWorkerMessage,
  isWorkerToMainMessage,
} from "@/game/protocol";

describe("protocol messages", () => {
  it("exposes protocol version 1 for phase 1", () => {
    expect(PROTOCOL_VERSION).toBe(1);
  });

  it("defaults physics to 120 Hz and snapshots to 60 Hz", () => {
    expect(DEFAULT_SIMULATION_CONFIG.physicsHz).toBe(120);
    expect(DEFAULT_SIMULATION_CONFIG.snapshotHz).toBe(60);
  });

  it("narrows main-to-worker message types", () => {
    expect(isMainToWorkerMessage({ type: "PAUSE" })).toBe(true);
    expect(isMainToWorkerMessage({ type: "READY", protocolVersion: 1 })).toBe(false);
    expect(isMainToWorkerMessage(null)).toBe(false);
  });

  it("narrows worker-to-main message types", () => {
    expect(isWorkerToMainMessage({ type: "READY", protocolVersion: 1 })).toBe(true);
    expect(isWorkerToMainMessage({ type: "PAUSE" })).toBe(false);
  });

  it("creates JSON-safe empty snapshots", () => {
    const snapshot = createEmptyRenderSnapshot(0, 1000);
    expect(() => JSON.stringify(snapshot)).not.toThrow();
    expect(snapshot.entities).toEqual([]);
    expect(snapshot.stagePhase).toBe("READY");
  });
});
