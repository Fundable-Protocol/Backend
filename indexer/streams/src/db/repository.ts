import type { DataSource } from "typeorm";
import { Stream } from "./entity/Stream.js";
import { WithdrawalAction } from "./entity/WithdrawalAction.js";
import { CancelAction } from "./entity/CancelAction.js";

export interface CreateStreamInput {
  id: string;
  sender: string;
  recipient: string;
  token: string;
  totalAmount: string;
  startTime: string;
  endTime: string;
}

export interface FundStreamInput {
  streamId: string;
  amount: string;
}

export interface RecordWithdrawalInput {
  streamId: string;
  recipient: string;
  amount: string;
  txHash: string;
  timestamp: string;
}

export interface RecordCancelInput {
  streamId: string;
  canceler: string;
  txHash: string;
  timestamp: string;
}

export interface StreamPersistence {
  createStream(input: CreateStreamInput): Promise<void>;
  fundStream(input: FundStreamInput): Promise<void>;
  recordWithdrawal(input: RecordWithdrawalInput): Promise<void>;
  recordCancel(input: RecordCancelInput): Promise<void>;
}

export class StreamRepository implements StreamPersistence {
  constructor(private readonly dataSource: DataSource) {}

  async createStream(input: CreateStreamInput): Promise<void> {
    await this.dataSource
      .getRepository(Stream)
      .createQueryBuilder()
      .insert()
      .into(Stream)
      .values({
        id: input.id,
        sender: input.sender,
        recipient: input.recipient,
        token: input.token,
        totalAmount: input.totalAmount,
        startTime: input.startTime,
        endTime: input.endTime,
        amountWithdrawn: "0",
        canceled: false,
      })
      .orIgnore() // Ignore duplicates on primary key
      .execute();
  }

  async fundStream(input: FundStreamInput): Promise<void> {
    await this.dataSource
      .getRepository(Stream)
      .createQueryBuilder()
      .update(Stream)
      .set({
        totalAmount: () => `"totalAmount" + :fundAmount`,
      })
      .where("id = :id", { id: input.streamId })
      .setParameter("fundAmount", input.amount)
      .execute();
  }

  async recordWithdrawal(input: RecordWithdrawalInput): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const result = await manager
        .createQueryBuilder()
        .insert()
        .into(WithdrawalAction)
        .values({
          streamId: input.streamId,
          recipient: input.recipient,
          amount: input.amount,
          txHash: input.txHash,
          timestamp: input.timestamp,
        })
        .execute(); // uuid primary key will always insert, but we should make sure we don't double count if same txHash etc.

      // Actually, wait, if event is replayed, the event index will prevent it. So we don't need orIgnore on uuid.
      
      await manager
        .createQueryBuilder()
        .update(Stream)
        .set({
          amountWithdrawn: () => `"amountWithdrawn" + :withdrawalAmount`,
        })
        .where("id = :id", { id: input.streamId })
        .setParameter("withdrawalAmount", input.amount)
        .execute();
    });
  }

  async recordCancel(input: RecordCancelInput): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      await manager
        .createQueryBuilder()
        .insert()
        .into(CancelAction)
        .values({
          streamId: input.streamId,
          canceler: input.canceler,
          txHash: input.txHash,
          timestamp: input.timestamp,
        })
        .execute();

      await manager
        .createQueryBuilder()
        .update(Stream)
        .set({
          canceled: true,
        })
        .where("id = :id", { id: input.streamId })
        .execute();
    });
  }
}
