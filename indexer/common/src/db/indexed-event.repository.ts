import { DataSource, Repository } from "typeorm";
import { IndexedEventEntity } from "./indexed-event.entity.js";

export interface IndexedEventData {
  contractId: string;
  ledgerNumber: bigint;
  transactionHash: string;
  eventIndex: number;
  eventData: Record<string, unknown>;
  eventTopics: string[];
  processedBy: string;
}

export class IndexedEventRepository {
  private repo: Repository<IndexedEventEntity>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(IndexedEventEntity);
  }

  /**
   * Safely insert an event with deduplication check.
   * Returns the existing event if already processed, otherwise inserts new.
   */
  async insertSafely(event: IndexedEventData): Promise<IndexedEventEntity> {
    try {
      const entity = this.repo.create(event);
      return await this.repo.save(entity);
    } catch (error: unknown) {
      // Check if it's a unique constraint violation (duplicate event)
      if (
        error instanceof Error &&
        "code" in error &&
        error.code === "23505" // PostgreSQL unique violation
      ) {
        // Find the existing event
        const existing = await this.repo.findOne({
          where: {
            contractId: event.contractId,
            ledgerNumber: event.ledgerNumber,
            transactionHash: event.transactionHash,
            eventIndex: event.eventIndex,
          },
        });
        if (existing) {
          return existing;
        }
      }
      throw error;
    }
  }

  /**
   * Check if an event has already been processed
   */
  async isProcessed(
    contractId: string,
    ledgerNumber: bigint,
    transactionHash: string,
    eventIndex: number,
  ): Promise<boolean> {
    const count = await this.repo.count({
      where: {
        contractId,
        ledgerNumber,
        transactionHash,
        eventIndex,
      },
    });
    return count > 0;
  }

  /**
   * Get events for a specific ledger range
   */
  async getByLedgerRange(
    startLedger: bigint,
    endLedger: bigint,
    domain?: string,
  ): Promise<IndexedEventEntity[]> {
    const query = this.repo
      .createQueryBuilder("event")
      .where("event.ledgerNumber >= :startLedger", { startLedger })
      .andWhere("event.ledgerNumber <= :endLedger", { endLedger })
      .orderBy("event.ledgerNumber", "ASC")
      .addOrderBy("event.eventIndex", "ASC");

    if (domain) {
      query.andWhere("event.processedBy = :domain", { domain });
    }

    return query.getMany();
  }

  /**
   * Get events for a specific contract
   */
  async getByContract(
    contractId: string,
    limit?: number,
  ): Promise<IndexedEventEntity[]> {
    const query = this.repo
      .createQueryBuilder("event")
      .where("event.contractId = :contractId", { contractId })
      .orderBy("event.ledgerNumber", "DESC")
      .addOrderBy("event.eventIndex", "DESC");

    if (limit) {
      query.limit(limit);
    }

    return query.getMany();
  }

  /**
   * Get the latest processed ledger for a domain
   */
  async getLatestLedger(domain?: string): Promise<bigint | null> {
    const query = this.repo
      .createQueryBuilder("event")
      .select("MAX(event.ledgerNumber)", "maxLedger");

    if (domain) {
      query.where("event.processedBy = :domain", { domain });
    }

    const result = await query.getRawOne();
    return result?.maxLedger ? BigInt(result.maxLedger) : null;
  }
}