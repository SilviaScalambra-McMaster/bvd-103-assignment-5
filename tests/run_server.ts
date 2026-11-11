import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, beforeEach } from "vitest";
import { ObjectId } from "mongodb";
import { createApp, type Services } from "../src/app";
import {
  type Book,
  type BookCatalogue,
  type BookFilter,
} from "../src/books/catalogue";
import type { BookDocument } from "../src/books/database";
import { InMemoryWarehouse } from "../src/warehouse/warehouse_data";
import { WarehouseService } from "../src/warehouse/warehouse_service";
import { InMemoryOrders } from "../src/orders/orders_data";
import { OrdersService } from "../src/orders/orders_service";

/** Deterministic in-memory catalogue for real HTTP tests without a Mongo daemon. */
class TestCatalogue implements BookCatalogue {
  private readonly books = new Map<string, Book>();

  async findById(id: string): Promise<Book | null> {
    return this.books.get(id) ?? null;
  }

  async list(filters: BookFilter[]): Promise<Book[]> {
    const books = [...this.books.values()];
    if (!filters.length) return books;
    return books.filter((book) =>
      filters.some(
        (filter) =>
          (filter.from === undefined || book.price >= filter.from) &&
          (filter.to === undefined || book.price <= filter.to) &&
          (filter.name === undefined ||
            new RegExp(filter.name, "i").test(book.name)) &&
          (filter.author === undefined ||
            new RegExp(filter.author, "i").test(book.author)),
      ),
    );
  }

  async create(input: BookDocument): Promise<Book> {
    const book = { ...input, id: new ObjectId().toHexString() };
    this.books.set(book.id, book);
    return book;
  }

  async update(id: string, input: BookDocument): Promise<Book | null> {
    if (!this.books.has(id)) return null;
    const book = { ...input, id };
    this.books.set(id, book);
    return book;
  }

  async delete(id: string): Promise<boolean> {
    return this.books.delete(id);
  }
}

export interface ServerTestContext {
  address: string;
  services: Services;
  closeServer: () => Promise<void>;
}

function makeServices(): Services {
  const catalogue = new TestCatalogue();
  const inventory = new InMemoryWarehouse();
  return {
    catalogue,
    warehouse: new WarehouseService(inventory, catalogue),
    orders: new OrdersService(new InMemoryOrders(), inventory, catalogue),
  };
}

async function close(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

/** One independently isolated Koa app and in-memory data set per API test. */
export default function setup(): void {
  beforeEach<ServerTestContext>(async (context) => {
    const services = makeServices();
    const server = createApp(services).listen(0);
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const info = server.address() as AddressInfo;
    context.address = `http://127.0.0.1:${info.port}`;
    context.services = services;
    context.closeServer = () => close(server);
  });

  afterEach<ServerTestContext>(async (context) => {
    if (context.closeServer) await context.closeServer();
  });
}
