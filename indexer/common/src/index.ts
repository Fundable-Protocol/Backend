export const commonPackage = {
  name: "@fundable-indexer/common",
  role: "shared-infrastructure",
} as const;

export { createHandlerRegistry, EventHandlerRegistry } from "./handlers/registry.js";
export type {
  EventHandler,
  HandlerEntry,
  HandlerFilter,
  HandlerRegistry,
  HandlerResult,
  SorobanEvent,
  SorobanEventIdentity,
} from "./handlers/types.js";
