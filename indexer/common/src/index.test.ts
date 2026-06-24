import { describe, expect, test } from "vitest";

import { commonPackage } from "./index.js";

describe("common package", () => {
  test("exposes package identity", () => {
    expect(commonPackage).toEqual({
      name: "@fundable-indexer/common",
      role: "shared-infrastructure",
    });
  });
});
