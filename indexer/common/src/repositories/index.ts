export interface CursorRepository {
  getCursor(): Promise<number>;
  saveCursor(ledger: number): Promise<void>;
}
