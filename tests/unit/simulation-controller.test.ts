import { describe, expect, it, vi } from "vitest";
import { DEFAULT_SIMULATION_CONFIG, PROTOCOL_VERSION } from "@/game/protocol";
import { SimulationController } from "@/game/simulation/simulationController";

describe("SimulationController", () => {
  it("returns READY after INIT", async () => {
    const controller = new SimulationController();
    const replies = await controller.handle({
      type: "INIT",
      seed: "s1",
      config: DEFAULT_SIMULATION_CONFIG,
    });

    expect(replies).toEqual([{ type: "READY", protocolVersion: PROTOCOL_VERSION }]);
    expect(controller.isReady).toBe(true);
    expect(controller.isPaused).toBe(false);
  });

  it("rejects double INIT", async () => {
    const controller = new SimulationController();
    await controller.handle({
      type: "INIT",
      seed: "s1",
      config: DEFAULT_SIMULATION_CONFIG,
    });
    const replies = await controller.handle({
      type: "INIT",
      seed: "s2",
      config: DEFAULT_SIMULATION_CONFIG,
    });

    expect(replies[0]?.type).toBe("ERROR");
  });

  it("stores INPUT only when sequence increases", async () => {
    const controller = new SimulationController();
    await controller.handle({
      type: "INIT",
      seed: "s1",
      config: DEFAULT_SIMULATION_CONFIG,
    });

    await controller.handle({
      type: "INPUT",
      sequence: 1,
      input: {
        trolleyAxis: 1,
        hoistAxis: 0,
        fineMode: false,
        lockPressed: false,
        emergencyStopPressed: false,
      },
    });
    await controller.handle({
      type: "INPUT",
      sequence: 1,
      input: {
        trolleyAxis: -1,
        hoistAxis: 0,
        fineMode: false,
        lockPressed: false,
        emergencyStopPressed: false,
      },
    });

    expect(controller.input.trolleyAxis).toBe(1);
  });

  it("pauses and resumes after ready", async () => {
    const onPause = vi.fn();
    const onResume = vi.fn();
    const controller = new SimulationController({ onPause, onResume });
    await controller.handle({
      type: "INIT",
      seed: "s1",
      config: DEFAULT_SIMULATION_CONFIG,
    });

    await controller.handle({ type: "PAUSE" });
    expect(controller.isPaused).toBe(true);
    expect(onPause).toHaveBeenCalledOnce();

    await controller.handle({ type: "RESUME" });
    expect(controller.isPaused).toBe(false);
    expect(onResume).toHaveBeenCalledOnce();
  });

  it("dispose blocks further commands", async () => {
    const onDispose = vi.fn();
    const controller = new SimulationController({ onDispose });
    await controller.handle({
      type: "INIT",
      seed: "s1",
      config: DEFAULT_SIMULATION_CONFIG,
    });
    await controller.handle({ type: "DISPOSE" });
    expect(onDispose).toHaveBeenCalledOnce();

    const replies = await controller.handle({ type: "PAUSE" });
    expect(replies[0]?.type).toBe("ERROR");
  });

  it("surfaces onInit failures as ERROR", async () => {
    const controller = new SimulationController({
      onInit: () => {
        throw new Error("wasm boom");
      },
    });
    const replies = await controller.handle({
      type: "INIT",
      seed: "s1",
      config: DEFAULT_SIMULATION_CONFIG,
    });

    expect(replies).toEqual([
      { type: "ERROR", code: "INIT_FAILED", message: "wasm boom" },
    ]);
    expect(controller.isReady).toBe(false);
  });
});
