import { describe, expect, it } from "vitest";
import {
  considerPersonalBest,
  isNewPersonalBest,
  personalBestStorageKey,
  readPersonalBest,
} from "@/app/settings/personalBest";
import { getOrCreatePlayerId, PLAYER_ID_STORAGE_KEY } from "@/app/settings/playerId";

function memoryStorage(initial: Record<string, string> = {}): Storage {
  const map = new Map(Object.entries(initial));
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.has(key) ? (map.get(key) ?? null) : null;
    },
    key(index: number) {
      return [...map.keys()][index] ?? null;
    },
    removeItem(key: string) {
      map.delete(key);
    },
    setItem(key: string, value: string) {
      map.set(key, value);
    },
  } as Storage;
}

describe("isNewPersonalBest", () => {
  it("accepts first score and only higher later", () => {
    expect(isNewPersonalBest(null, 1000)).toBe(true);
    expect(isNewPersonalBest(5000, 5000)).toBe(false);
    expect(isNewPersonalBest(5000, 4999)).toBe(false);
    expect(isNewPersonalBest(5000, 5001)).toBe(true);
  });
});

describe("considerPersonalBest", () => {
  it("writes first best and rejects equal or lower", () => {
    const storage = memoryStorage();
    const first = considerPersonalBest(
      {
        stageId: "unloading",
        rulesetVersion: "unloading-v1",
        score: 80_000,
        grade: "A",
        seed: "s1",
        nowMs: 1,
      },
      storage,
    );
    expect(first.updated).toBe(true);
    expect(first.personalBest?.score).toBe(80_000);

    const same = considerPersonalBest(
      {
        stageId: "unloading",
        rulesetVersion: "unloading-v1",
        score: 80_000,
        grade: "A",
        seed: "s2",
        nowMs: 2,
      },
      storage,
    );
    expect(same.updated).toBe(false);
    expect(same.personalBest?.seed).toBe("s1");

    const better = considerPersonalBest(
      {
        stageId: "unloading",
        rulesetVersion: "unloading-v1",
        score: 90_000,
        grade: "S",
        seed: "s3",
        nowMs: 3,
      },
      storage,
    );
    expect(better.updated).toBe(true);
    expect(readPersonalBest("unloading", "unloading-v1", storage)?.score).toBe(90_000);
  });

  it("scopes bests by ruleset version", () => {
    const storage = memoryStorage();
    considerPersonalBest(
      {
        stageId: "unloading",
        rulesetVersion: "unloading-v1",
        score: 10,
        grade: "E",
        seed: "a",
      },
      storage,
    );
    expect(readPersonalBest("unloading", "unloading-v2", storage)).toBeNull();
    expect(personalBestStorageKey("unloading", "unloading-v1")).toContain(
      "unloading-v1",
    );
  });
});

describe("getOrCreatePlayerId", () => {
  it("creates once and reuses", () => {
    const storage = memoryStorage();
    let n = 0;
    const createId = () => `id-${++n}`;
    const a = getOrCreatePlayerId(storage, createId);
    const b = getOrCreatePlayerId(storage, createId);
    expect(a).toBe("id-1");
    expect(b).toBe("id-1");
    expect(storage.getItem(PLAYER_ID_STORAGE_KEY)).toBe("id-1");
  });
});
