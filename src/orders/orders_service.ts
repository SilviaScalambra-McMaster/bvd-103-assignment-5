import type { BookCatalogue } from "../books/catalogue";
import { HttpError, nonemptyString, positiveInteger } from "../shared/errors";
import type { WarehouseData } from "../warehouse/warehouse_data";
import type { OrdersData } from "./orders_data";

export interface FulfillmentSelection {
  book: string;
  shelf: string;
  numberOfBooks: number;
}

// One service instance serializes fulfilment requests in this Node process.
// MongoDB still uses conditional decrements, protecting against stale stock reads.
export class OrdersService {
  private fulfillmentQueue: Promise<void> = Promise.resolve();

  constructor(
    private readonly orders: OrdersData,
    private readonly warehouse: WarehouseData,
    private readonly catalogue: Pick<BookCatalogue, "findById">,
  ) {}

  async placeOrder(books: unknown): Promise<{ orderId: string }> {
    if (!Array.isArray(books) || books.length === 0) {
      throw new HttpError(400, "books must be a non-empty array.");
    }
    const counts: Record<string, number> = Object.create(null) as Record<
      string,
      number
    >;
    for (const value of books as unknown[]) {
      const bookId = nonemptyString(value, "book ID");
      counts[bookId] = (counts[bookId] ?? 0) + 1;
    }
    for (const id of Object.keys(counts)) {
      if (!(await this.catalogue.findById(id))) {
        throw new HttpError(400, `Cannot order nonexistent book ${id}.`);
      }
    }
    return { orderId: await this.orders.create({ ...counts }) };
  }

  async listOrders(): Promise<
    Array<{ orderId: string; books: Record<string, number> }>
  > {
    return (await this.orders.listPending()).map(({ orderId, books }) => ({
      orderId,
      books,
    }));
  }

  async fulfilOrder(orderId: string, request: unknown): Promise<void> {
    nonemptyString(orderId, "orderId");
    const selections = this.validateSelections(request);
    // Keep every in-process fulfilment operation serialized, including rollback.
    const previous = this.fulfillmentQueue;
    let unlock: () => void = () => {};
    this.fulfillmentQueue = new Promise<void>((resolve) => {
      unlock = resolve;
    });
    await previous;
    try {
      await this.completeFulfilment(orderId, selections);
    } finally {
      unlock();
    }
  }

  private validateSelections(request: unknown): FulfillmentSelection[] {
    if (!Array.isArray(request) || request.length === 0) {
      throw new HttpError(400, "fulfillment must be a non-empty array.");
    }
    const merged = new Map<string, FulfillmentSelection>();
    for (const value of request as unknown[]) {
      if (typeof value !== "object" || value === null || Array.isArray(value)) {
        throw new HttpError(
          400,
          "Each fulfillment selection must be an object.",
        );
      }
      const input = value as Record<string, unknown>;
      const book = nonemptyString(input.book, "book");
      const shelf = nonemptyString(input.shelf, "shelf");
      const numberOfBooks = positiveInteger(
        input.numberOfBooks,
        "numberOfBooks",
      );
      const key = JSON.stringify([book, shelf]);
      const old = merged.get(key);
      merged.set(key, {
        book,
        shelf,
        numberOfBooks: (old?.numberOfBooks ?? 0) + numberOfBooks,
      });
    }
    return [...merged.values()];
  }

  private async completeFulfilment(
    orderId: string,
    selections: FulfillmentSelection[],
  ): Promise<void> {
    const order = await this.orders.findById(orderId);
    if (!order) throw new HttpError(404, "Order not found.");
    if (order.status !== "pending")
      throw new HttpError(409, "Order already fulfilled.");

    const requested: Record<string, number> = Object.create(null) as Record<
      string,
      number
    >;
    for (const selection of selections) {
      requested[selection.book] =
        (requested[selection.book] ?? 0) + selection.numberOfBooks;
    }
    if (
      Object.keys(order.books).length !== Object.keys(requested).length ||
      Object.entries(order.books).some(
        ([book, count]) => requested[book] !== count,
      )
    ) {
      throw new HttpError(
        400,
        "Fulfillment quantities must exactly match the order.",
      );
    }

    for (const { book, shelf, numberOfBooks } of selections) {
      const available = await this.warehouse.getCopiesOnShelf(book, shelf);
      if (available < numberOfBooks) {
        throw new HttpError(
          409,
          `Insufficient stock on shelf ${shelf} for ${book}.`,
        );
      }
    }

    const deducted: FulfillmentSelection[] = [];
    try {
      for (const selection of selections) {
        const success = await this.warehouse.takeCopies(
          selection.book,
          selection.shelf,
          selection.numberOfBooks,
        );
        if (!success) {
          throw new HttpError(409, "Stock changed while fulfilling the order.");
        }
        deducted.push(selection);
      }
      if (!(await this.orders.markFulfilled(orderId))) {
        throw new HttpError(409, "Order is no longer pending.");
      }
    } catch (error) {
      // Compensation for a failed multi-shelf operation. Multi-instance
      // deployments should use replica-set transactions instead.
      for (const { book, shelf, numberOfBooks } of deducted.reverse()) {
        await this.warehouse.placeBookOnShelf(book, shelf, numberOfBooks);
      }
      throw error;
    }
  }
}
