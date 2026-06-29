import { HandlerRegistry, loadIndexerConfig, runIndexer } from "@fundable-indexer/common";
import { CancelAction } from "./db/entity/CancelAction.js";
import { Stream } from "./db/entity/Stream.js";
import { WithdrawalAction } from "./db/entity/WithdrawalAction.js";
import {
  streamCancelHandler,
  streamFundedHandler,
  streamWithdrawalHandler,
} from "./handlers/index.js";

async function main() {
  const config = loadIndexerConfig();
  const registry = new HandlerRegistry();

  for (const contractId of config.streamsContractIds) {
    registry.register({ contractId, topic: "stream_funded" }, streamFundedHandler);
    registry.register({ contractId, topic: "stream_withdrawal" }, streamWithdrawalHandler);
    registry.register({ contractId, topic: "stream_cancel" }, streamCancelHandler);
  }

  await runIndexer({
    name: "streams-indexer",
    contractIds: config.streamsContractIds,
    registry,
    entities: [Stream, WithdrawalAction, CancelAction],
  });
}

main().catch((err) => {
  console.error("Streams indexer exited with fatal error:", err);
  process.exit(1);
});
