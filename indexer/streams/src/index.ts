import { commonPackage } from "@fundable-indexer/common";

export const streamsPackage = {
  name: "@fundable-indexer/streams",
  role: "payment-stream-indexer",
  common: commonPackage.name,
} as const;

export {
  handleStreamCreated,
  parseStreamCreatedPayload,
  STREAM_CREATED_TOPIC,
} from "./handlers/streamCreated.js";
export type { StreamCreatedEvent, StreamRecord } from "./handlers/types.js";
