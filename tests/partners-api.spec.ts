import { expect, test } from "vitest";
import {
  BooksApi,
  Configuration,
  HelloApi,
  OrdersApi,
  WarehouseApi,
} from "../client";
import setup, { type ServerTestContext } from "./run_server";

setup();

const newBook = {
  name: "A Test Novel",
  author: "A Writer",
  description: "Detailed description",
  price: 12,
  image: "https://example.org/cover.png",
};

function api(address: string) {
  const config = new Configuration({ basePath: address });
  return {
    books: new BooksApi(config),
    warehouse: new WarehouseApi(config),
    orders: new OrdersApi(config),
    hello: new HelloApi(config),
  };
}

test<ServerTestContext>("the generated SDK reaches the hello endpoint", async ({
  address,
}) => {
  expect(await api(address).hello.sayHello({ name: "partner" })).toBe(
    "Hello partner",
  );
});

test<ServerTestContext>("the generated SDK handles book CRUD and live stock", async ({
  address,
}) => {
  const { books, warehouse } = api(address);
  const created = await books.createBook({ bookInput: newBook });
  expect(created).toMatchObject({ ...newBook, stock: 0 });
  expect(created.id).toMatch(/^[0-9a-f]{24}$/);

  await warehouse.placeBooksOnShelf({
    shelfPlacement: { bookId: created.id, numberOfBooks: 3, shelf: "A-1" },
  });
  await warehouse.placeBooksOnShelf({
    shelfPlacement: { bookId: created.id, numberOfBooks: 2, shelf: "B-1" },
  });
  expect(await warehouse.getBookLocations({ bookId: created.id })).toEqual([
    { shelf: "A-1", count: 3 },
    { shelf: "B-1", count: 2 },
  ]);
  expect(await books.getBook({ id: created.id })).toMatchObject({ stock: 5 });
  expect(await books.listBooks()).toEqual([
    expect.objectContaining({ id: created.id, stock: 5 }),
  ]);

  const updated = await books.updateBook({
    id: created.id,
    bookInput: { ...newBook, name: "Revised Novel", price: 16 },
  });
  expect(updated).toMatchObject({ name: "Revised Novel", price: 16, stock: 5 });
  await books.deleteBook({ id: created.id });
  await expect(books.getBook({ id: created.id })).rejects.toMatchObject({
    response: { status: 404 },
  });
});

test<ServerTestContext>("search supports OR between groups and AND within groups", async ({
  address,
}) => {
  const { books } = api(address);
  await books.createBook({ bookInput: newBook });
  await books.createBook({
    bookInput: {
      ...newBook,
      name: "Another Story",
      author: "Somebody Else",
      price: 40,
    },
  });
  const result = await books.searchBooks({
    searchBooksRequest: {
      filters: [{ author: "Writer", to: 20 }, { from: 35 }],
    },
  });
  expect(result).toHaveLength(2);
  expect(await books.listBooks({ name: "Test" })).toHaveLength(1);
});

test<ServerTestContext>("orders can be placed and fulfilled via generated SDK", async ({
  address,
}) => {
  const { books, warehouse, orders } = api(address);
  const { id } = await books.createBook({ bookInput: newBook });
  await warehouse.placeBooksOnShelf({
    shelfPlacement: { bookId: id, shelf: "A", numberOfBooks: 1 },
  });
  await warehouse.placeBooksOnShelf({
    shelfPlacement: { bookId: id, shelf: "B", numberOfBooks: 1 },
  });
  const { orderId } = await orders.placeOrder({
    placeOrderRequest: { books: [id, id] },
  });
  expect(await orders.listOrders()).toEqual([{ orderId, books: { [id]: 2 } }]);

  await orders.fulfilOrder({
    orderId,
    fulfillmentRequest: {
      fulfillment: [
        { book: id, shelf: "A", numberOfBooks: 1 },
        { book: id, shelf: "B", numberOfBooks: 1 },
      ],
    },
  });
  expect(await orders.listOrders()).toEqual([]);
  expect((await books.getBook({ id })).stock).toBe(0);
  await expect(
    orders.fulfilOrder({
      orderId,
      fulfillmentRequest: {
        fulfillment: [{ book: id, shelf: "A", numberOfBooks: 1 }],
      },
    }),
  ).rejects.toMatchObject({ response: { status: 409 } });
});

test<ServerTestContext>("invalid payloads return 400, not 500", async ({
  address,
}) => {
  const { books, warehouse, orders } = api(address);
  await expect(
    books.createBook({
      bookInput: { ...newBook, price: -10 },
    }),
  ).rejects.toMatchObject({ response: { status: 400 } });
  await expect(
    orders.placeOrder({
      placeOrderRequest: { books: [] },
    }),
  ).rejects.toMatchObject({ response: { status: 400 } });
  const { id } = await books.createBook({ bookInput: newBook });
  await expect(
    warehouse.placeBooksOnShelf({
      shelfPlacement: { bookId: id, shelf: "A", numberOfBooks: 0 },
    }),
  ).rejects.toMatchObject({ response: { status: 400 } });
  await expect(books.getBook({ id: "bad-id" })).rejects.toMatchObject({
    response: { status: 400 },
  });
  // `unknown` extras are rejected by tsoa's generated runtime validator.
  const extra = await fetch(`${address}/books`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...newBook, surprise: true }),
  });
  expect(extra.status).toBe(400);
});

test<ServerTestContext>("Swagger UI and OpenAPI spec are served", async ({
  address,
}) => {
  const docs = await fetch(`${address}/docs`);
  expect(docs.status).toBe(200);
  expect((await docs.text()).toLowerCase()).toContain("swagger");

  const spec = await fetch(`${address}/docs/spec`);
  expect(spec.status).toBe(200);
  const swagger = (await spec.json()) as {
    openapi: string;
    paths: Record<string, unknown>;
  };
  expect(swagger.openapi).toMatch(/^3\./);
  expect(swagger.paths).toHaveProperty("/books");
  expect(swagger.paths).toHaveProperty("/orders");
  expect(swagger.paths).toHaveProperty("/warehouse/shelves");
});
