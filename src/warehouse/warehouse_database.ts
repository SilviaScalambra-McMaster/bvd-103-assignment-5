import { type Collection } from "mongodb";
import {
  type BookID,
  type ShelfId,
  type WarehouseData,
} from "./warehouse_data";

export interface InventoryDocument {
  bookId: BookID;
  shelf: ShelfId;
  count: number;
}

export class DatabaseWarehouse implements WarehouseData {
  constructor(private readonly inventory: Collection<InventoryDocument>) {}

  async ensureIndexes(): Promise<void> {
    await this.inventory.createIndex({ bookId: 1, shelf: 1 }, { unique: true });
  }

  async placeBookOnShelf(
    bookId: BookID,
    shelf: ShelfId,
    count: number,
  ): Promise<void> {
    await this.inventory.updateOne(
      { bookId, shelf },
      { $inc: { count } },
      { upsert: true },
    );
  }

  async getCopiesOnShelf(bookId: BookID, shelf: ShelfId): Promise<number> {
    const document = await this.inventory.findOne({ bookId, shelf });
    return document?.count ?? 0;
  }

  async getCopies(bookId: BookID): Promise<Record<ShelfId, number>> {
    const documents = await this.inventory
      .find({ bookId, count: { $gt: 0 } })
      .toArray();
    return Object.fromEntries(
      documents.map(({ shelf, count }) => [shelf, count]),
    );
  }

  async takeCopies(
    bookId: BookID,
    shelf: ShelfId,
    count: number,
  ): Promise<boolean> {
    const result = await this.inventory.updateOne(
      { bookId, shelf, count: { $gte: count } },
      { $inc: { count: -count } },
    );
    return result.modifiedCount === 1;
  }
}
