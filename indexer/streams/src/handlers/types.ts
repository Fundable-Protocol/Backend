export interface StreamFundedPayload {
  streamId: string;
  sender: string;
  amount: string;
  token: string;
  transactionHash: string;
}

export interface StreamWithdrawalPayload {
  streamId: string;
  recipient: string;
  amount: string;
  transactionHash: string;
}

export interface StreamCancelPayload {
  streamId: string;
  cancelledBy: string;
  senderBalance: string;
  recipientBalance: string;
  transactionHash: string;
}

export function parseStreamFunded(data: unknown): StreamFundedPayload {
  const d = data as Record<string, unknown>;
  return {
    streamId: String(d.streamId ?? d.stream_id ?? ""),
    sender: String(d.sender ?? ""),
    amount: String(d.amount ?? "0"),
    token: String(d.token ?? ""),
    transactionHash: String(d.transactionHash ?? d.tx_hash ?? ""),
  };
}

export function parseStreamWithdrawal(data: unknown): StreamWithdrawalPayload {
  const d = data as Record<string, unknown>;
  return {
    streamId: String(d.streamId ?? d.stream_id ?? ""),
    recipient: String(d.recipient ?? ""),
    amount: String(d.amount ?? "0"),
    transactionHash: String(d.transactionHash ?? d.tx_hash ?? ""),
  };
}

export function parseStreamCancel(data: unknown): StreamCancelPayload {
  const d = data as Record<string, unknown>;
  return {
    streamId: String(d.streamId ?? d.stream_id ?? ""),
    cancelledBy: String(d.cancelledBy ?? d.cancelled_by ?? ""),
    senderBalance: String(d.senderBalance ?? d.sender_balance ?? "0"),
    recipientBalance: String(
      d.recipientBalance ?? d.recipient_balance ?? "0",
    ),
    transactionHash: String(d.transactionHash ?? d.tx_hash ?? ""),
  };
}
