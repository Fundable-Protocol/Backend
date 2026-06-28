export interface PollerOptions {
  maxRetries?: number;
  retryDelayMs?: number;
}

export interface PollResult {
  success: boolean;
  error?: Error;
  lastProcessedLedger?: number;
}

export class SorobanPoller {
  private maxRetries: number;
  private retryDelayMs: number;
  private isRunning = false;

  constructor(options: PollerOptions = {}) {
    this.maxRetries = options.maxRetries ?? 3;
    this.retryDelayMs = options.retryDelayMs ?? 1000;
  }

  /**
   * Utility to wait for a given amount of time.
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Executes a block of logic with retry for transient RPC errors.
   */
  public async withRetry<T>(operation: () => Promise<T>): Promise<T> {
    let attempt = 0;
    while (true) {
      try {
        return await operation();
      } catch (error) {
        attempt++;
        if (attempt > this.maxRetries || !this.isTransientError(error)) {
          throw error;
        }
        await this.delay(this.retryDelayMs);
      }
    }
  }

  /**
   * Determines if an error is transient and should be retried.
   */
  private isTransientError(error: unknown): boolean {
    // Basic transient error checking - expand based on specific RPC error formats
    const message = error instanceof Error ? error.message : String(error);
    return (
      message.includes("timeout") ||
      message.includes("rate limit") ||
      message.includes("ECONNRESET") ||
      message.includes("503") ||
      message.includes("504") ||
      message.includes("502")
    );
  }

  /**
   * Processes a ledger range. Returns success=true if processing completes,
   * otherwise returns an error and the operation stops without advancing cursor.
   */
  public async processLedgerRange<TEvent = unknown>(
    startLedger: number,
    endLedger: number,
    fetchEvents: (start: number, end: number) => Promise<TEvent[]>,
    processEvent: (event: TEvent) => Promise<void>,
    updateCursor: (ledger: number) => Promise<void>,
  ): Promise<PollResult> {
    try {
      // 1. Fetch events with retry logic for RPC
      const events = await this.withRetry(() => fetchEvents(startLedger, endLedger));

      // 2. Process events sequentially
      for (const event of events) {
        // If a handler fails, it throws, skipping the updateCursor step
        await processEvent(event);
      }

      // 3. Update cursor ONLY if all events in the range succeeded
      await updateCursor(endLedger);
      return { success: true, lastProcessedLedger: endLedger };
    } catch (error) {
      // Return the error to surface it. Cursor is intentionally not advanced.
      return { success: false, error: error instanceof Error ? error : new Error(String(error)) };
    }
  }
}
