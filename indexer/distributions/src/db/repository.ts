import type { DataSource } from "typeorm";
import { ClaimAction } from "./entity/ClaimAction.js";
import { DistributionBatch, DistributionStatus } from "./entity/DistributionBatch.js";

/** Payload required to persist a newly created distribution batch. */
export interface CreateBatchInput {
  distributionId: string;
  contractId: string;
  distributor: string;
  token: string;
  totalAmount: string;
  recipientCount: number;
  ledgerNumber: number;
  txHash: string;
}

/** Payload required to record a token claim against a batch. */
export interface RecordClaimInput {
  distributionId: string;
  claimant: string;
  amount: string;
  txHash: string;
  ledgerNumber: number;
  eventIndex: number;
  eventTimestamp: string;
}

/** Payload required to apply a pause/resume status change. */
export interface SetStatusInput {
  distributionId: string;
  status: DistributionStatus;
  /** ISO timestamp the event closed at, recorded on the matching status field. */
  changedAt: string;
}

/**
 * Explicit persistence API for distribution batches and claims.
 *
 * Methods are written to be safe under event replay: batch creation ignores
 * conflicting inserts, claim recording is keyed on a unique event identity, and
 * the derived `claimedAmount` is only incremented when a new claim row is
 * actually inserted.
 */
export interface DistributionPersistence {
  createBatch(input: CreateBatchInput): Promise<void>;
  recordClaim(input: RecordClaimInput): Promise<void>;
  setStatus(input: SetStatusInput): Promise<void>;
}

export class DistributionRepository implements DistributionPersistence {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Inserts a distribution batch. A repeated `distribution_created` event for
   * the same on-chain ID is ignored rather than overwriting existing state.
   */
  async createBatch(input: CreateBatchInput): Promise<void> {
    await this.dataSource
      .getRepository(DistributionBatch)
      .createQueryBuilder()
      .insert()
      .into(DistributionBatch)
      .values({
        id: input.distributionId,
        uniqueRef: input.distributionId,
        contractId: input.contractId,
        distributor: input.distributor,
        token: input.token,
        totalAmount: input.totalAmount,
        claimedAmount: "0",
        recipientCount: input.recipientCount,
        status: DistributionStatus.ACTIVE,
        ledgerNumber: input.ledgerNumber,
        txHash: input.txHash,
      })
      .orIgnore()
      .execute();
  }

  /**
   * Records a claim and increments the batch's claimed total in one transaction.
   * The claim insert ignores duplicates on the unique event identity, and the
   * batch total is only advanced when a row is actually written, so replays do
   * not double-count.
   */
  async recordClaim(input: RecordClaimInput): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const result = await manager
        .createQueryBuilder()
        .insert()
        .into(ClaimAction)
        .values({
          batchId: input.distributionId,
          claimant: input.claimant,
          amount: input.amount,
          txHash: input.txHash,
          ledgerNumber: input.ledgerNumber,
          eventIndex: input.eventIndex,
          eventTimestamp: input.eventTimestamp,
        })
        .orIgnore()
        .execute();

      const inserted = (result.identifiers ?? []).some((id) => id != null);
      if (!inserted) {
        return;
      }

      await manager
        .createQueryBuilder()
        .update(DistributionBatch)
        .set({
          claimedAmount: () => `"claimedAmount" + :claimAmount`,
        })
        .where("id = :distributionId", { distributionId: input.distributionId })
        .setParameter("claimAmount", input.amount)
        .execute();
    });
  }

  /**
   * Applies a paused/resumed status change, recording the timestamp on the
   * matching field. No-op if the batch does not exist.
   */
  async setStatus(input: SetStatusInput): Promise<void> {
    const patch: Partial<DistributionBatch> =
      input.status === DistributionStatus.PAUSED
        ? { status: input.status, pausedAt: input.changedAt }
        : { status: input.status, resumedAt: input.changedAt };

    await this.dataSource
      .getRepository(DistributionBatch)
      .update({ id: input.distributionId }, patch);
  }
}
