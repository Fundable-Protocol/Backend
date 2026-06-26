import { Event } from '../rpc';

export interface EventHandler {
  name: string;
  supports(event: Event): boolean;
  handle(event: Event): Promise<void>;
}
