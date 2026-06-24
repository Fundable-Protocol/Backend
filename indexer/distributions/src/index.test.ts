import { describe, expect, test } from "vitest";

import { distributionsPackage } from "./index.js";

describe("distributions package", () => {
  test("exposes package identity", () => {
    expect(distributionsPackage).toEqual({
      name: "@fundable-indexer/distributions",
      role: "distribution-indexer",
      common: "@fundable-indexer/common",
    });
  });
});
