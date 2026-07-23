import type { DataSource, Repository } from "typeorm";
import { CancelAction } from "./entity/CancelAction.js";
import { Stream } from "./entity/Stream.js";
import { WithdrawalAction } from "./entity/WithdrawalAction.js";

export interface StreamCreateInput {
  id: string;
  sender: string;
  recipient: string;
  token: string;
  totalAmount: string;
  startTime: string;
  endTime: string;
}

export interface StreamWriteService {
  createStream(input: StreamCreateInput, eventKey?: string): Promise<void>;
  fundStream(streamId: string, amount: string, eventKey?: string): Promise<void>;
  recordWithdrawal(
    streamId: string,
    recipient: string,
    amount: string,
    txHash: string,
    timestamp: string,
    eventKey?: string,
  ): Promise<void>;
  recordCancel(
    streamId: string,
    canceler: string,
    txHash: string,
    timestamp: string,
    eventKey?: string,
  ): Promise<void>;
}

export class StreamWriteServiceImpl implements StreamWriteService {
  private processedEventKeys = new Set<string>();

  constructor(private readonly repository: StreamRepository) {}

  async createStream(input: StreamCreateInput, eventKey?: string): Promise<void> {
    if (eventKey && this.processedEventKeys.has(eventKey)) {
      return;
    }

    await this.repository.createStream(input);

    if (eventKey) {
      this.processedEventKeys.add(eventKey);
    }
  }

  async fundStream(streamId: string, amount: string, eventKey?: string): Promise<void> {
    if (eventKey && this.processedEventKeys.has(eventKey)) {
      return;
    }

    await this.repository.fundStream(streamId, amount);

    if (eventKey) {
      this.processedEventKeys.add(eventKey);
    }
  }

  async recordWithdrawal(
    streamId: string,
    recipient: string,
    amount: string,
    txHash: string,
    timestamp: string,
    eventKey?: string,
  ): Promise<void> {
    if (eventKey && this.processedEventKeys.has(eventKey)) {
      return;
    }

    await this.repository.recordWithdrawal(streamId, recipient, amount, txHash, timestamp);

    if (eventKey) {
      this.processedEventKeys.add(eventKey);
    }
  }

  async recordCancel(
    streamId: string,
    canceler: string,
    txHash: string,
    timestamp: string,
    eventKey?: string,
  ): Promise<void> {
    if (eventKey && this.processedEventKeys.has(eventKey)) {
      return;
    }

    await this.repository.recordCancel(streamId, canceler, txHash, timestamp);

    if (eventKey) {
      this.processedEventKeys.add(eventKey);
    }
  }
}

export function createStreamWriteService(repository: StreamRepository): StreamWriteService {
  return new StreamWriteServiceImpl(repository);
}

export class StreamRepository {
  private streamRepo: Repository<Stream>;
  private withdrawalRepo: Repository<WithdrawalAction>;
  private cancelRepo: Repository<CancelAction>;

  constructor(private dataSource: DataSource) {
    this.streamRepo = this.dataSource.getRepository(Stream);
    this.withdrawalRepo = this.dataSource.getRepository(WithdrawalAction);
    this.cancelRepo = this.dataSource.getRepository(CancelAction);
  }

  async createStream(input: StreamCreateInput): Promise<void> {
    await this.streamRepo.upsert(
      this.streamRepo.create({
        id: input.id,
        sender: input.sender,
        recipient: input.recipient,
        token: input.token,
        totalAmount: input.totalAmount,
        startTime: input.startTime,
        endTime: input.endTime,
        amountWithdrawn: "0",
        canceled: false,
      }),
      ["id"],
    );
  }

  async getStreamById(streamId: string): Promise<Stream | null> {
    return this.streamRepo.findOneBy({ id: streamId });
  }

  async fundStream(streamId: string, amount: string): Promise<void> {
    const amountBigInt = BigInt(amount);
    if (amountBigInt <= 0n) {
      throw new Error("Funding amount must be positive");
    }

    const stream = await this.getStreamById(streamId);
    if (!stream) {
      throw new Error(`Stream not found: ${streamId}`);
    }

    const nextTotalAmount = (BigInt(stream.totalAmount) + amountBigInt).toString();
    await this.streamRepo.update({ id: streamId }, { totalAmount: nextTotalAmount });
  }

  async recordWithdrawal(
    streamId: string,
    recipient: string,
    amount: string,
    txHash: string,
    timestamp: string,
  ): Promise<void> {
    const existingWithdrawal = await this.withdrawalRepo.findOne({
      where: { streamId, txHash },
    });
    if (existingWithdrawal) {
      return;
    }

    const stream = await this.getStreamById(streamId);
    if (!stream) {
      throw new Error(`Stream not found: ${streamId}`);
    }

    const amountBigInt = BigInt(amount);
    if (amountBigInt <= 0n) {
      throw new Error("Withdrawal amount must be positive");
    }

    await this.dataSource.transaction(async (manager) => {
      const withdrawalRepo = manager.getRepository(WithdrawalAction);
      const streamRepo = manager.getRepository(Stream);

      await withdrawalRepo.insert({
        streamId,
        recipient,
        amount,
        txHash,
        timestamp,
      });

      const nextWithdrawn = (BigInt(stream.amountWithdrawn) + amountBigInt).toString();
      await streamRepo.update({ id: streamId }, { amountWithdrawn: nextWithdrawn });
    });
  }

  async recordCancel(
    streamId: string,
    canceler: string,
    txHash: string,
    timestamp: string,
  ): Promise<void> {
    const existingCancel = await this.cancelRepo.findOne({
      where: { streamId, txHash },
    });
    if (existingCancel) {
      return;
    }

    const stream = await this.getStreamById(streamId);
    if (!stream) {
      throw new Error(`Stream not found: ${streamId}`);
    }

    await this.dataSource.transaction(async (manager) => {
      const cancelRepo = manager.getRepository(CancelAction);
      const streamRepo = manager.getRepository(Stream);

      await cancelRepo.insert({
        streamId,
        canceler,
        txHash,
        timestamp,
      });

      await streamRepo.update({ id: streamId }, { canceled: true });
    });
  }
}
