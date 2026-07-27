import { describe, expect, it } from "vitest";
import { initRapier } from "@/game/simulation/rapierInit";

describe("rapier init", () => {
  it("initializes WASM and can create a World", async () => {
    const RAPIER = await initRapier();
    const world = new RAPIER.World({ x: 0, y: 30 });
    expect(typeof world.step).toBe("function");
    world.free();
  });

  it("reuses the same init promise", async () => {
    const a = initRapier();
    const b = initRapier();
    await expect(Promise.all([a, b])).resolves.toHaveLength(2);
  });
});
