import test from "node:test"
import assert from "node:assert/strict"

import { createCairoCampaignClient } from "../services/cairo/campaignFactory.client"

test("createCairoCampaignClient returns mock client when CAIRO_MOCK=true", async () => {
  const prev = process.env.CAIRO_MOCK
  process.env.CAIRO_MOCK = "true"

  try {
    const client = createCairoCampaignClient()
    await client.assertContractAccessible("0x1")
    const result = await client.createCampaign({
      campaignRef: "ABCDE",
      targetAmount: "1",
      donationToken: "0x1",
    })

    assert.ok(result.transactionHash.startsWith("0xmock_"))
    assert.equal(result.campaignId, "mock_ABCDE")
  } finally {
    if (prev === undefined) delete process.env.CAIRO_MOCK
    else process.env.CAIRO_MOCK = prev
  }
})

