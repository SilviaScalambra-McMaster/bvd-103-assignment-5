import { HttpError, nonemptyString, positiveInteger } from "../shared/errors";
import type { BookCatalogue } from "../books/catalogue";
import { type WarehouseData } from "./warehouse_data";

export interface StockReader {
  getStock(bookId: string): Promise<number>;
}

export class WarehouseService implements StockReader {
  constructor(
    public readonly data: WarehouseData,
    private readonly catalogue: Pick<BookCatalogue, "findById">,
  ) {}

  async placeBooksOnShelf(
    bookId: string,
    count: number,
    shelf: string,
  ): Promise<void> {
    nonemptyString(bookId, "bookId");
    nonemptyString(shelf, "shelf");
    positiveInteger(count, "numberOfBooks");
    if (!(await this.catalogue.findById(bookId))) {
      throw new HttpError(404, "Book not found.");
    }
    await this.data.placeBookOnShelf(bookId, shelf, count);
  }

  async getLocations(
    bookId: string,
  ): Promise<Array<{ shelf: string; count: number }>> {
    nonemptyString(bookId, "bookId");
    if (!(await this.catalogue.findById(bookId))) {
      throw new HttpError(404, "Book not found.");
    }
    const byShelf = await this.data.getCopies(bookId);
    return Object.entries(byShelf)
      .map(([shelf, count]) => ({ shelf, count }))
      .sort((a, b) => a.shelf.localeCompare(b.shelf));
  }

  async getStock(bookId: string): Promise<number> {
    const byShelf = await this.data.getCopies(bookId);
    return Object.values(byShelf).reduce((total, count) => total + count, 0);
  }
}
