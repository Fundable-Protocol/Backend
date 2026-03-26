export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export const withRetry = async <T>(
  fn: () => Promise<T>,
  options?: {
    retries?: number
    minDelayMs?: number
    factor?: number
  }
) => {
  const retries = options?.retries ?? 3
  const minDelayMs = options?.minDelayMs ?? 250
  const factor = options?.factor ?? 2

  let attempt = 0
  let lastError: unknown
  while (attempt <= retries) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (attempt === retries) break

      const backoff = Math.round(minDelayMs * Math.pow(factor, attempt))
      const jitter = Math.round(Math.random() * 100)
      await sleep(backoff + jitter)
      attempt += 1
    }
  }

  throw lastError
}

