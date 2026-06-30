import test from "node:test"
import assert from "node:assert/strict"

import {
  createStarknetCampaignClient,
  type StarknetDeps,
} from "../services/cairo/campaignFactory.starknet"

// Minimal env that satisfies all required vars
const REQUIRED_ENV: Record<string, string> = {
  CAIRO_RPC_URL: "http://localhost:5050",
  CAIRO_ACCOUNT_ADDRESS: "0xaccount",
  CAIRO_PRIVATE_KEY: "0xprivkey",
  CAIRO_FACTORY_CONTRACT_ADDRESS: "0xfactory",
}

function setEnv(overrides: Record<string, string | undefined>) {
  const prev: Record<string, string | undefined> = {}
  for (const [k, v] of Object.entries(overrides)) {
    prev[k] = process.env[k]
    if (v === undefined) delete process.env[k]
    else process.env[k] = v
  }
  return prev
}

function restoreEnv(prev: Record<string, string | undefined>) {
  for (const [k, v] of Object.entries(prev)) {
    if (v === undefined) delete process.env[k]
    else process.env[k] = v
  }
}

function makeDeps(overrides: Partial<StarknetDeps> = {}): StarknetDeps {
  return {
    provider: {
      getClassHashAt: async () => "0xclass",
      waitForTransaction: async () => ({ events: [] }),
    },
    account: {
      execute: async () => ({ transaction_hash: "0xdeadbeef" }),
    },
    ...overrides,
  }
}

// --- Missing required env var tests ---

test("createStarknetCampaignClient throws when CAIRO_RPC_URL is missing", () => {
  const prev = setEnv({ ...REQUIRED_ENV, CAIRO_RPC_URL: undefined })
  try {
    assert.throws(() => createStarknetCampaignClient(), {
      message: "Missing required env var: CAIRO_RPC_URL",
    })
  } finally {
    restoreEnv(prev)
  }
})

test("createStarknetCampaignClient throws when CAIRO_ACCOUNT_ADDRESS is missing", () => {
  const prev = setEnv({ ...REQUIRED_ENV, CAIRO_ACCOUNT_ADDRESS: undefined })
  try {
    assert.throws(() => createStarknetCampaignClient(), {
      message: "Missing required env var: CAIRO_ACCOUNT_ADDRESS",
    })
  } finally {
    restoreEnv(prev)
  }
})

test("createStarknetCampaignClient throws when CAIRO_PRIVATE_KEY is missing", () => {
  const prev = setEnv({ ...REQUIRED_ENV, CAIRO_PRIVATE_KEY: undefined })
  try {
    assert.throws(() => createStarknetCampaignClient(), {
      message: "Missing required env var: CAIRO_PRIVATE_KEY",
    })
  } finally {
    restoreEnv(prev)
  }
})

test("createStarknetCampaignClient throws when CAIRO_FACTORY_CONTRACT_ADDRESS is missing", () => {
  const prev = setEnv({ ...REQUIRED_ENV, CAIRO_FACTORY_CONTRACT_ADDRESS: undefined })
  try {
    assert.throws(() => createStarknetCampaignClient(), {
      message: "Missing required env var: CAIRO_FACTORY_CONTRACT_ADDRESS",
    })
  } finally {
    restoreEnv(prev)
  }
})

// --- Transaction hash extraction ---

test("createCampaign throws when execute returns no transaction hash", async () => {
  const prev = setEnv({ ...REQUIRED_ENV, CAMPAIGN_CREATED_EVENT_KEY: undefined })
  try {
    const deps = makeDeps({
      account: { execute: async () => ({}) },
    })
    const client = createStarknetCampaignClient(deps)
    await assert.rejects(
      () => client.createCampaign({ campaignRef: "ABCDE", targetAmount: "1", donationToken: "0xtoken" }),
      { message: "Contract call did not return a transaction hash" }
    )
  } finally {
    restoreEnv(prev)
  }
})

test("createCampaign accepts transactionHash as fallback field name", async () => {
  const prev = setEnv({ ...REQUIRED_ENV, CAMPAIGN_CREATED_EVENT_KEY: undefined })
  try {
    const deps = makeDeps({
      account: { execute: async () => ({ transactionHash: "0xfallback" }) },
    })
    const client = createStarknetCampaignClient(deps)
    const result = await client.createCampaign({
      campaignRef: "ABCDE",
      targetAmount: "1",
      donationToken: "0xtoken",
    })
    assert.equal(result.transactionHash, "0xfallback")
  } finally {
    restoreEnv(prev)
  }
})

// --- Campaign ID parsing ---

test("createCampaign uses transaction hash as campaignId when CAMPAIGN_CREATED_EVENT_KEY is not set", async () => {
  const prev = setEnv({ ...REQUIRED_ENV, CAMPAIGN_CREATED_EVENT_KEY: undefined })
  try {
    const deps = makeDeps()
    const client = createStarknetCampaignClient(deps)
    const result = await client.createCampaign({
      campaignRef: "ABCDE",
      targetAmount: "1",
      donationToken: "0xtoken",
    })
    assert.equal(result.campaignId, result.transactionHash)
  } finally {
    restoreEnv(prev)
  }
})

test("createCampaign extracts campaignId from matching event data when key is configured", async () => {
  const prev = setEnv({
    ...REQUIRED_ENV,
    CAMPAIGN_CREATED_EVENT_KEY: "0xEventKey",
  })
  try {
    const deps = makeDeps({
      provider: {
        getClassHashAt: async () => "0xclass",
        waitForTransaction: async () => ({
          events: [
            { keys: ["0xeventkey"], data: ["0xcampaign123"] },
          ],
        }),
      },
    })
    const client = createStarknetCampaignClient(deps)
    const result = await client.createCampaign({
      campaignRef: "ABCDE",
      targetAmount: "1",
      donationToken: "0xtoken",
    })
    assert.equal(result.campaignId, "0xcampaign123")
  } finally {
    restoreEnv(prev)
  }
})

test("createCampaign falls back to transactionHash when event key does not match any event", async () => {
  const prev = setEnv({
    ...REQUIRED_ENV,
    CAMPAIGN_CREATED_EVENT_KEY: "0xMissingKey",
  })
  try {
    const deps = makeDeps({
      provider: {
        getClassHashAt: async () => "0xclass",
        waitForTransaction: async () => ({
          events: [{ keys: ["0xdifferentkey"], data: ["0xcampaign123"] }],
        }),
      },
    })
    const client = createStarknetCampaignClient(deps)
    const result = await client.createCampaign({
      campaignRef: "ABCDE",
      targetAmount: "1",
      donationToken: "0xtoken",
    })
    assert.equal(result.campaignId, result.transactionHash)
  } finally {
    restoreEnv(prev)
  }
})

test("parseEventCampaignId matching is case-insensitive", async () => {
  const prev = setEnv({
    ...REQUIRED_ENV,
    CAMPAIGN_CREATED_EVENT_KEY: "0XUPPERCASEKEY",
  })
  try {
    const deps = makeDeps({
      provider: {
        getClassHashAt: async () => "0xclass",
        waitForTransaction: async () => ({
          events: [{ keys: ["0xuppercasekey"], data: ["0xcampaignid"] }],
        }),
      },
    })
    const client = createStarknetCampaignClient(deps)
    const result = await client.createCampaign({
      campaignRef: "ABCDE",
      targetAmount: "1",
      donationToken: "0xtoken",
    })
    assert.equal(result.campaignId, "0xcampaignid")
  } finally {
    restoreEnv(prev)
  }
})

test("createCampaign falls back to transactionHash when matched event has no data", async () => {
  const prev = setEnv({
    ...REQUIRED_ENV,
    CAMPAIGN_CREATED_EVENT_KEY: "0xeventkey",
  })
  try {
    const deps = makeDeps({
      provider: {
        getClassHashAt: async () => "0xclass",
        waitForTransaction: async () => ({
          events: [{ keys: ["0xeventkey"], data: [] }],
        }),
      },
    })
    const client = createStarknetCampaignClient(deps)
    const result = await client.createCampaign({
      campaignRef: "ABCDE",
      targetAmount: "1",
      donationToken: "0xtoken",
    })
    assert.equal(result.campaignId, result.transactionHash)
  } finally {
    restoreEnv(prev)
  }
})

// --- Retry behavior ---

test("assertContractAccessible retries on provider failure and resolves on eventual success", async () => {
  const prev = setEnv(REQUIRED_ENV)
  try {
    let calls = 0
    const deps = makeDeps({
      provider: {
        getClassHashAt: async () => {
          calls++
          if (calls < 3) throw new Error("RPC error")
          return "0xclass"
        },
        waitForTransaction: async () => ({ events: [] }),
      },
    })
    const client = createStarknetCampaignClient(deps)
    await client.assertContractAccessible("0xaddr")
    assert.equal(calls, 3)
  } finally {
    restoreEnv(prev)
  }
})

test("createCampaign retries execute on transient failure and returns result on success", async () => {
  const prev = setEnv({ ...REQUIRED_ENV, CAMPAIGN_CREATED_EVENT_KEY: undefined })
  try {
    let calls = 0
    const deps = makeDeps({
      account: {
        execute: async () => {
          calls++
          if (calls < 2) throw new Error("transient RPC failure")
          return { transaction_hash: "0xsuccesstx" }
        },
      },
    })
    const client = createStarknetCampaignClient(deps)
    const result = await client.createCampaign({
      campaignRef: "ABCDE",
      targetAmount: "1",
      donationToken: "0xtoken",
    })
    assert.equal(result.transactionHash, "0xsuccesstx")
    assert.equal(calls, 2)
  } finally {
    restoreEnv(prev)
  }
})

test("createCampaign throws after exhausting retries on persistent RPC failure", async () => {
  const prev = setEnv({ ...REQUIRED_ENV, CAMPAIGN_CREATED_EVENT_KEY: undefined })
  try {
    const deps = makeDeps({
      account: {
        execute: async () => {
          throw new Error("persistent RPC failure")
        },
      },
    })
    const client = createStarknetCampaignClient(deps)
    await assert.rejects(
      () => client.createCampaign({ campaignRef: "ABCDE", targetAmount: "1", donationToken: "0xtoken" }),
      { message: "persistent RPC failure" }
    )
  } finally {
    restoreEnv(prev)
  }
})
