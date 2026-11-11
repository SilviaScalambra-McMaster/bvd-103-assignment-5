import { describe, expect, it } from "vitest";
import { InMemoryWarehouse } from "../warehouse/warehouse_data";
import { InMemoryOrders } from "./orders_data";
import { OrdersService } from "./orders_service";

const bookA = "507f1f77bcf86cd799439011";
const bookB = "507f1f77bcf86cd799439012";
const catalogue = {
  findById: async (id: string) =>
    [bookA, bookB].includes(id)
      ? {
          id,
          name: "Test",
          author: "Writer",
          description: "",
          price: 1,
          image: "",
        }
      : null,
};

function fixture() {
  const warehouse = new InMemoryWarehouse();
  const data = new InMemoryOrders();
  const orders = new OrdersService(data, warehouse, catalogue);
  return { warehouse, data, orders };
}

describe("orders domain", () => {
  it("allows ordering existing books without stock and groups duplicates", async () => {
    const { orders } = fixture();
    const { orderId } = await orders.placeOrder([bookA, bookA, bookB]);
    expect(await orders.listOrders()).toEqual([
      { orderId, books: { [bookA]: 2, [bookB]: 1 } },
    ]);
  });

  it("rejects unknown books without saving an order", async () => {
    const { orders } = fixture();
    await expect(orders.placeOrder([bookA, "unknown"])).rejects.toMatchObject({
      status: 400,
    });
    expect(await orders.listOrders()).toEqual([]);
  });

  it("rejects empty orders", async () => {
    const { orders } = fixture();
    await expect(orders.placeOrder([])).rejects.toMatchObject({ status: 400 });
  });

  it("fulfils using multiple shelves and removes order from pending list", async () => {
    const { warehouse, orders, data } = fixture();
    await warehouse.placeBookOnShelf(bookA, "A", 1);
    await warehouse.placeBookOnShelf(bookA, "B", 2);
    const { orderId } = await orders.placeOrder([bookA, bookA, bookA]);
    await orders.fulfilOrder(orderId, [
      { book: bookA, shelf: "A", numberOfBooks: 1 },
      { book: bookA, shelf: "B", numberOfBooks: 2 },
    ]);
    expect(await warehouse.getCopiesOnShelf(bookA, "A")).toBe(0);
    expect(await warehouse.getCopiesOnShelf(bookA, "B")).toBe(0);
    expect(await data.findById(orderId)).toMatchObject({ status: "fulfilled" });
    expect(await orders.listOrders()).toEqual([]);
  });

  it("rejects insufficient stock without changing any shelf", async () => {
    const { warehouse, orders } = fixture();
    await warehouse.placeBookOnShelf(bookA, "A", 2);
    const { orderId } = await orders.placeOrder([bookA, bookA, bookA]);
    await expect(
      orders.fulfilOrder(orderId, [
        { book: bookA, shelf: "A", numberOfBooks: 3 },
      ]),
    ).rejects.toMatchObject({ status: 409 });
    expect(await warehouse.getCopiesOnShelf(bookA, "A")).toBe(2);
    expect(await orders.listOrders()).toHaveLength(1);
  });

  it("rejects incomplete and excessive selections", async () => {
    const { warehouse, orders } = fixture();
    await warehouse.placeBookOnShelf(bookA, "A", 6);
    const { orderId } = await orders.placeOrder([bookA, bookA]);
    for (const count of [1, 3]) {
      await expect(
        orders.fulfilOrder(orderId, [
          { book: bookA, shelf: "A", numberOfBooks: count },
        ]),
      ).rejects.toMatchObject({ status: 400 });
    }
    expect(await warehouse.getCopiesOnShelf(bookA, "A")).toBe(6);
  });

  it("handles duplicate shelf selections correctly", async () => {
    const { warehouse, orders } = fixture();
    await warehouse.placeBookOnShelf(bookA, "A", 1);
    const { orderId } = await orders.placeOrder([bookA, bookA]);
    await expect(
      orders.fulfilOrder(orderId, [
        { book: bookA, shelf: "A", numberOfBooks: 1 },
        { book: bookA, shelf: "A", numberOfBooks: 1 },
      ]),
    ).rejects.toMatchObject({ status: 409 });
    expect(await warehouse.getCopiesOnShelf(bookA, "A")).toBe(1);
  });

  it("prevents fulfilling a completed order twice", async () => {
    const { warehouse, orders } = fixture();
    await warehouse.placeBookOnShelf(bookA, "A", 2);
    const { orderId } = await orders.placeOrder([bookA]);
    const selection = [{ book: bookA, shelf: "A", numberOfBooks: 1 }];
    await orders.fulfilOrder(orderId, selection);
    await expect(orders.fulfilOrder(orderId, selection)).rejects.toMatchObject({
      status: 409,
    });
    expect(await warehouse.getCopiesOnShelf(bookA, "A")).toBe(1);
  });

  it("validates selection quantities", async () => {
    const { orders } = fixture();
    const { orderId } = await orders.placeOrder([bookA]);
    for (const count of [0, -1, 0.5]) {
      await expect(
        orders.fulfilOrder(orderId, [
          { book: bookA, shelf: "A", numberOfBooks: count },
        ]),
      ).rejects.toMatchObject({ status: 400 });
    }
  });

  it("serializes two simultaneous fulfilments for the same order", async () => {
    const { orders, warehouse } = fixture();
    await warehouse.placeBookOnShelf(bookA, "A", 2);
    const { orderId } = await orders.placeOrder([bookA]);
    const request = [{ book: bookA, shelf: "A", numberOfBooks: 1 }];
    const results = await Promise.allSettled([
      orders.fulfilOrder(orderId, request),
      orders.fulfilOrder(orderId, request),
    ]);
    expect(results.filter((x) => x.status === "fulfilled")).toHaveLength(1);
    expect(await warehouse.getCopiesOnShelf(bookA, "A")).toBe(1);
  });
  it("restores previously deducted shelves after a later decrement fails", async () => {
    const warehouse = new InMemoryWarehouse();
    await warehouse.placeBookOnShelf(bookA, "A", 1);
    await warehouse.placeBookOnShelf(bookA, "B", 1);
    const failingWarehouse = {
      placeBookOnShelf: (book: string, shelf: string, count: number) =>
        warehouse.placeBookOnShelf(book, shelf, count),
      getCopies: (book: string) => warehouse.getCopies(book),
      getCopiesOnShelf: (book: string, shelf: string) =>
        warehouse.getCopiesOnShelf(book, shelf),
      takeCopies: async (book: string, shelf: string, count: number) =>
        shelf !== "B" && warehouse.takeCopies(book, shelf, count),
    };
    const orders = new OrdersService(
      new InMemoryOrders(),
      failingWarehouse,
      catalogue,
    );
    const { orderId } = await orders.placeOrder([bookA, bookA]);
    await expect(
      orders.fulfilOrder(orderId, [
        { book: bookA, shelf: "A", numberOfBooks: 1 },
        { book: bookA, shelf: "B", numberOfBooks: 1 },
      ]),
    ).rejects.toMatchObject({ status: 409 });
    expect(await warehouse.getCopiesOnShelf(bookA, "A")).toBe(1);
    expect(await warehouse.getCopiesOnShelf(bookA, "B")).toBe(1);
  });
});
