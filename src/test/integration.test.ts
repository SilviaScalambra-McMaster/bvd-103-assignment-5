import { type AddressInfo } from "node:net";
import { type Server } from "node:http";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { MongoBookCatalogue } from "../books/catalogue";
import { type BookDocument } from "../books/database";
import { createApp, type Services } from "../app";
import { InMemoryWarehouse } from "../warehouse/warehouse_data";
import {
  DatabaseWarehouse,
  type InventoryDocument,
} from "../warehouse/warehouse_database";
import { WarehouseService } from "../warehouse/warehouse_service";
import { DatabaseOrders, type OrderDocument } from "../orders/orders_database";
import { OrdersService } from "../orders/orders_service";
import { createTestDatabase } from "./database_test_setup";

type TestDb = Awaited<ReturnType<typeof createTestDatabase>>;
let database: TestDb;
let http: Server;
let baseUrl: string;
let services: Services;

beforeAll(async () => {
  database = await createTestDatabase();
});
afterAll(async () => {
  if (http)
    await new Promise<void>((resolve, reject) =>
      http.close((err) => (err ? reject(err) : resolve())),
    );
  if (database) await database.stop();
});
beforeEach(async () => {
  if (http)
    await new Promise<void>((resolve, reject) =>
      http.close((err) => (err ? reject(err) : resolve())),
    );
  const books = database.client
    .db(database.isolatedName("catalogue"))
    .collection<BookDocument>("books");
  const inventory = database.client
    .db(database.isolatedName("warehouse"))
    .collection<InventoryDocument>("shelf_inventory");
  const orders = database.client
    .db(database.isolatedName("orders"))
    .collection<OrderDocument>("orders");
  const catalogue = new MongoBookCatalogue(books);
  const warehouseData = new DatabaseWarehouse(inventory);
  const ordersData = new DatabaseOrders(orders);
  await Promise.all([
    warehouseData.ensureIndexes(),
    ordersData.ensureIndexes(),
  ]);
  const warehouse = new WarehouseService(warehouseData, catalogue);
  services = {
    catalogue,
    warehouse,
    orders: new OrdersService(ordersData, warehouseData, catalogue),
  };
  http = createApp(services).listen(0);
  await new Promise<void>((resolve) => http.once("listening", resolve));
  const address = http.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
});

async function request(path: string, method = "GET", body?: unknown) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    ...(body === undefined
      ? {}
      : {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
  });
  const text = await response.text();
  return {
    status: response.status,
    body: text ? (JSON.parse(text) as unknown) : null,
  };
}

const newBook = {
  name: "A Test Novel",
  author: "A Writer",
  description: "Test description",
  price: 12,
  image: "https://example.org/image.jpg",
};

async function insertBook(): Promise<string> {
  const result = await request("/books", "POST", newBook);
  expect(result.status).toBe(201);
  return (result.body as { id: string }).id;
}

describe("MongoDB integration and HTTP API", () => {
  it("reads a catalogue book and includes its current stock", async () => {
    const id = await insertBook();
    const initial = await request(`/books/${id}`);
    expect(initial.status).toBe(200);
    expect(initial.body).toMatchObject({ id, stock: 0, name: newBook.name });
    expect(
      (
        await request("/warehouse/shelves", "POST", {
          bookId: id,
          numberOfBooks: 5,
          shelf: "A",
        })
      ).status,
    ).toBe(204);
    const book = await request(`/books/${id}`);
    expect(book.body).toMatchObject({ stock: 5 });
    const list = await request("/books");
    expect(list.body).toEqual([expect.objectContaining({ id, stock: 5 })]);
  });

  it("places an order even when stock is unavailable", async () => {
    const id = await insertBook();
    const result = await request("/orders", "POST", { books: [id, id] });
    expect(result.status).toBe(201);
    const orderId = (result.body as { orderId: string }).orderId;
    expect((await request("/orders")).body).toEqual([
      { orderId, books: { [id]: 2 } },
    ]);
  });

  it("fulfils a persistent Mongo order from different shelves", async () => {
    const id = await insertBook();
    await request("/warehouse/shelves", "POST", {
      bookId: id,
      numberOfBooks: 2,
      shelf: "A",
    });
    await request("/warehouse/shelves", "POST", {
      bookId: id,
      numberOfBooks: 1,
      shelf: "B",
    });
    const created = await request("/orders", "POST", { books: [id, id, id] });
    const orderId = (created.body as { orderId: string }).orderId;
    const fulfil = await request(`/orders/${orderId}/fulfill`, "POST", {
      fulfillment: [
        { book: id, shelf: "A", numberOfBooks: 2 },
        { book: id, shelf: "B", numberOfBooks: 1 },
      ],
    });
    expect(fulfil.status).toBe(204);
    expect((await request("/orders")).body).toEqual([]);
    expect((await request(`/books/${id}`)).body).toMatchObject({ stock: 0 });
    expect((await request(`/warehouse/books/${id}/locations`)).body).toEqual(
      [],
    );
  });

  it("rejects insufficient stock without affecting any shelf", async () => {
    const id = await insertBook();
    await request("/warehouse/shelves", "POST", {
      bookId: id,
      numberOfBooks: 1,
      shelf: "A",
    });
    const created = await request("/orders", "POST", { books: [id, id] });
    const orderId = (created.body as { orderId: string }).orderId;
    const failed = await request(`/orders/${orderId}/fulfill`, "POST", {
      fulfillment: [{ book: id, shelf: "A", numberOfBooks: 2 }],
    });
    expect(failed.status).toBe(409);
    expect((await request(`/books/${id}`)).body).toMatchObject({ stock: 1 });
    expect((await request("/orders")).body).toHaveLength(1);
  });

  it("rejects nonexistent book orders", async () => {
    const result = await request("/orders", "POST", {
      books: ["507f1f77bcf86cd799439011"],
    });
    expect(result.status).toBe(400);
  });

  it("preserves Assignment 3 filter semantics", async () => {
    await insertBook();
    await request("/books", "POST", {
      ...newBook,
      name: "Different",
      author: "Other",
      price: 30,
    });
    const nameFilter = await request("/books?filters[0][name]=Test");
    expect(nameFilter.body as unknown[]).toHaveLength(1);
    const orFilter = await request(
      "/books?filters[0][author]=Writer&filters[1][from]=25",
    );
    expect(orFilter.body as unknown[]).toHaveLength(2);
  });

  it("does not depend on a database-specific inventory algorithm", async () => {
    const bookId = await insertBook();
    const inMemory = new InMemoryWarehouse();
    const persistent = services.warehouse.data as DatabaseWarehouse;
    for (const adapter of [inMemory, persistent]) {
      await adapter.placeBookOnShelf(bookId, "A", 3);
      await adapter.placeBookOnShelf(bookId, "A", 2);
      await adapter.placeBookOnShelf(bookId, "B", 1);
      expect(await adapter.takeCopies(bookId, "A", 4)).toBe(true);
      expect(await adapter.takeCopies(bookId, "A", 2)).toBe(false);
    }
    expect(await persistent.getCopies(bookId)).toEqual(
      await inMemory.getCopies(bookId),
    );
  });
});
