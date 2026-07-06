import { describe, expect, it } from "vitest";
import { createSorobanClient } from "./client.js";

describe("RPC Client Wrapper", () => {
  it("should create a client with the provided URL", () => {
    const url = "https://soroban-testnet.stellar.org";
    const client = createSorobanClient(url);
    expect(client.serverURL.toString()).toBe("https://soroban-testnet.stellar.org/");
  });

  it("should use the default configuration if no URL is provided", () => {
    const client = createSorobanClient();
    expect(client.serverURL.toString()).toBe("https://soroban-testnet.stellar.org/");
  });
});
