import { HandlerRegistry, loadIndexerConfig, runIndexer } from "@fundable-indexer/common";
import {
  distributionCreatedHandler,
  distributionPausedHandler,
  distributionResumedHandler,
  tokensClaimedHandler,
} from "./handlers/index.js";

async function main() {
  const config = loadIndexerConfig();
  const registry = new HandlerRegistry();

  for (const contractId of config.distributionsContractIds) {
    registry.register({ contractId, topic: "distribution_created" }, distributionCreatedHandler);
    registry.register({ contractId, topic: "tokens_claimed" }, tokensClaimedHandler);
    registry.register({ contractId, topic: "distribution_paused" }, distributionPausedHandler);
    registry.register({ contractId, topic: "distribution_resumed" }, distributionResumedHandler);
  }

  await runIndexer({
    name: "distributions-indexer",
    contractIds: config.distributionsContractIds,
    registry,
    entities: [], // No domain-specific entities yet for distributions indexer
  });
}

main().catch((err) => {
  console.error("Distributions indexer exited with fatal error:", err);
  process.exit(1);
});
