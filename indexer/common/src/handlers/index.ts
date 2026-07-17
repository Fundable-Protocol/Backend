import { Event } from '../rpc';

export interface EventHandler {
  name: string;
  supports(event: Event): boolean;
  handle(event: Event): Promise<void>;
}

export { HandlerRegistry } from "./registry.js";
export type {
  EventHandler,
  HandlerFilter,
  HandlerResult,
  SorobanEventInput,
} from "./types.js";