import { describe, expect, it } from "vitest";
import { PROJECT_ID, SITE_DOMAIN } from "@shared/contracts/identity";

describe("project identity", () => {
  it("uses the stable gnfl identifier", () => {
    expect(PROJECT_ID).toBe("gnfl");
  });

  it("targets the approved public domain", () => {
    expect(SITE_DOMAIN).toBe("gnfl.pitekusu.dev");
  });
});
