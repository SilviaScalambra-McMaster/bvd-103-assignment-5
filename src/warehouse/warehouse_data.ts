export type BookID = string;
export type ShelfId = string;

export interface WarehouseData {
  placeBookOnShelf(
    bookId: BookID,
    shelf: ShelfId,
    count: number,
  ): Promise<void>;
  getCopiesOnShelf(bookId: BookID, shelf: ShelfId): Promise<number>;
  getCopies(bookId: BookID): Promise<Record<ShelfId, number>>;
  // Attempt an atomic conditional decrement. Returns false when insufficient.
  takeCopies(bookId: BookID, shelf: ShelfId, count: number): Promise<boolean>;
}

export class InMemoryWarehouse implements WarehouseData {
  private readonly books = new Map<BookID, Map<ShelfId, number>>();

  async placeBookOnShelf(
    bookId: BookID,
    shelf: ShelfId,
    count: number,
  ): Promise<void> {
    const shelves = this.books.get(bookId) ?? new Map<ShelfId, number>();
    shelves.set(shelf, (shelves.get(shelf) ?? 0) + count);
    this.books.set(bookId, shelves);
  }

  async getCopiesOnShelf(bookId: BookID, shelf: ShelfId): Promise<number> {
    return this.books.get(bookId)?.get(shelf) ?? 0;
  }

  async getCopies(bookId: BookID): Promise<Record<ShelfId, number>> {
    return Object.fromEntries(
      [...(this.books.get(bookId)?.entries() ?? [])].filter(
        ([, count]) => count > 0,
      ),
    );
  }

  async takeCopies(
    bookId: BookID,
    shelf: ShelfId,
    count: number,
  ): Promise<boolean> {
    const available = await this.getCopiesOnShelf(bookId, shelf);
    if (available < count) return false;
    const shelves = this.books.get(bookId);
    if (!shelves) return false;
    shelves.set(shelf, available - count);
    return true;
  }
}
