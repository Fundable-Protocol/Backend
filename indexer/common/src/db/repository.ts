import type { DataSource, Repository } from "typeorm";
import type { SorobanEventInput } from "../handlers/types.js";
import { IndexedEvent } from "./entity/IndexedEvent.js";

export interface EventIdentity {
  contractId: string;
  ledgerNumber: number;
  txHash: string;
  eventIndex: number;
}

/**
 * Maps a SorobanEventInput to its deterministic event identity fields.
 */
export function getSorobanEventIdentity(event: SorobanEventInput): EventIdentity {
  let txHash = event.pagingToken || event.id || "";
  let eventIndex = 0;

  if (event.id?.includes("-")) {
    const parts = event.id.split("-");
    const lastPart = parts[parts.length - 1];
    if (lastPart && /^\d+$/.test(lastPart)) {
      eventIndex = Number.parseInt(lastPart, 10);
      txHash = parts.slice(0, -1).join("-");
    }
  } else if (event.pagingToken?.includes("-")) {
    const parts = event.pagingToken.split("-");
    const lastPart = parts[parts.length - 1];
    if (lastPart && /^\d+$/.test(lastPart)) {
      eventIndex = Number.parseInt(lastPart, 10);
      txHash = parts.slice(0, -1).join("-");
    }
  }

  return {
    contractId: event.contractId,
    ledgerNumber: event.ledger,
    txHash,
    eventIndex,
  };
}

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
