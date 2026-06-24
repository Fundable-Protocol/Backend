import { describe, expect, test } from "vitest";

import { streamsPackage } from "./index.js";

describe("streams package", () => {
  test("exposes package identity", () => {
    expect(streamsPackage).toEqual({
      name: "@fundable-indexer/streams",
      role: "payment-stream-indexer",
      common: "@fundable-indexer/common",
    });
  });
});
