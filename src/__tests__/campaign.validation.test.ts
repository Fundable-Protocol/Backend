import test from "node:test"
import assert from "node:assert/strict"

import { createCampaignSchema, isPositiveU256String, isValidStarknetAddress, toU256Parts } from "../components/v1/campaign/campaign.validation"

test("isPositiveU256String validates u256 integer strings", () => {
  assert.equal(isPositiveU256String("0"), false)
  assert.equal(isPositiveU256String("-1"), false)
  assert.equal(isPositiveU256String("1"), true)
  assert.equal(isPositiveU256String("10"), true)
  assert.equal(isPositiveU256String(" 10 "), false)
})

test("isValidStarknetAddress validates hex contract addresses", () => {
  assert.equal(isValidStarknetAddress("0x0"), true)
  assert.equal(isValidStarknetAddress("0x123abc"), true)
  assert.equal(isValidStarknetAddress("123"), false)
  assert.equal(isValidStarknetAddress("0xZZ"), false)
})

test("toU256Parts splits numbers into low/high 128-bit limbs", () => {
  const parts = toU256Parts("340282366920938463463374607431768211456") // 2^128
  assert.equal(parts.low, "0x0")
  assert.equal(parts.high, "0x1")
})

test("createCampaignSchema enforces required constraints", () => {
  assert.throws(() => createCampaignSchema.parse({}), /Required/)

  assert.throws(
    () =>
      createCampaignSchema.parse({
        campaign_ref: "    ",
        target_amount: "1",
        donation_token: "0x1",
      }),
    /campaign_ref/
  )

  assert.throws(
    () =>
      createCampaignSchema.parse({
        campaign_ref: "ABCDE",
        target_amount: "0",
        donation_token: "0x1",
      }),
    /target_amount/
  )

  const ok = createCampaignSchema.parse({
    campaign_ref: "ABCDE",
    target_amount: "123",
    donation_token: "0x1",
  })

  assert.equal(ok.campaign_ref, "ABCDE")
})

