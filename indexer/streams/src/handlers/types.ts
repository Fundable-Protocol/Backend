export interface StreamFundedPayload {
  streamId: string | undefined;
  sender: string | undefined;
  amount: string | undefined;
  token: string | undefined;
  transactionHash: string | undefined;
}

export interface StreamWithdrawalPayload {
  streamId: string | undefined;
  recipient: string | undefined;
  amount: string | undefined;
  transactionHash: string | undefined;
}

export interface StreamCancelPayload {
  streamId: string | undefined;
  cancelledBy: string | undefined;
  senderBalance: string | undefined;
  recipientBalance: string | undefined;
  transactionHash: string | undefined;
}

function record(v: unknown): Record<string, unknown> {
  return v !== null && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

function str(v: unknown): string | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const s = String(v);
  return s === "" ? undefined : s;
}

export function parseStreamFunded(data: unknown): StreamFundedPayload {
  const d = record(data);
  return {
    streamId: str(d.streamId ?? d.stream_id),
    sender: str(d.sender),
    amount: str(d.amount),
    token: str(d.token),
    transactionHash: str(d.transactionHash ?? d.tx_hash),
  };
}

export function parseStreamWithdrawal(data: unknown): StreamWithdrawalPayload {
  const d = record(data);
  return {
    streamId: str(d.streamId ?? d.stream_id),
    recipient: str(d.recipient),
    amount: str(d.amount),
    transactionHash: str(d.transactionHash ?? d.tx_hash),
  };
}

export function parseStreamCancel(data: unknown): StreamCancelPayload {
  const d = record(data);
  return {
    streamId: str(d.streamId ?? d.stream_id),
    cancelledBy: str(d.cancelledBy ?? d.cancelled_by),
    senderBalance: str(d.senderBalance ?? d.sender_balance),
    recipientBalance: str(d.recipientBalance ?? d.recipient_balance),
    transactionHash: str(d.transactionHash ?? d.tx_hash),
  };
}
