import test from "node:test"
import assert from "node:assert/strict"

import { withRetry } from "../services/cairo/retry"

test("withRetry retries and eventually succeeds", async () => {
  let calls = 0

  const result = await withRetry(
    async () => {
      calls += 1
      if (calls < 3) throw new Error("fail")
      return "ok"
    },
    { retries: 3, minDelayMs: 1, factor: 1 }
  )

  assert.equal(result, "ok")
  assert.equal(calls, 3)
})

test("withRetry throws after exhausting retries", async () => {
  let calls = 0
  await assert.rejects(
    () =>
      withRetry(
        async () => {
          calls += 1
          throw new Error("fail")
        },
        { retries: 2, minDelayMs: 1, factor: 1 }
      ),
    /fail/
  )
  assert.equal(calls, 3) // initial + 2 retries
})

