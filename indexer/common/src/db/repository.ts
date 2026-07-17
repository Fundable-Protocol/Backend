import type { DataSource, Repository } from "typeorm";
import { IndexedEvent } from "./entity/IndexedEvent.js";

export class EventRepository {
  private repo: Repository<IndexedEvent>;

  constructor(private dataSource: DataSource) {
    this.repo = this.dataSource.getRepository(IndexedEvent);
  }

  /**
   * Checks if an event has already been processed based on its deterministic identity.
   */
  async isEventProcessed(
    contractId: string,
    ledgerNumber: number,
    txHash: string,
    eventIndex: number,
  ): Promise<boolean> {
    const count = await this.repo.count({
      where: {
        contractId,
        ledgerNumber,
        txHash,
        eventIndex,
      },
    });
    return count > 0;
  }

  /**
   * Records an event as processed safely handling duplicates without throwing.
   */
  async recordEventProcessed(
    contractId: string,
    ledgerNumber: number,
    txHash: string,
    eventIndex: number,
  ): Promise<boolean> {
    try {
      await this.repo
        .createQueryBuilder()
        .insert()
        .into(IndexedEvent)
        .values({
          contractId,
          ledgerNumber,
          txHash,
          eventIndex,
        })
        .orIgnore("uq_indexed_event_identity") // Safe duplicate insert
        .execute();
      return true;
    } catch (err) {
      // If the driver doesn't support orIgnore, fallback to simple insert and catch unique violation.
      if (err instanceof Error && err.message.includes("unique constraint")) {
        return false;
      }
      throw err;
    }
  }
}
