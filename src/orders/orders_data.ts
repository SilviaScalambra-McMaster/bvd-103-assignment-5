import { randomUUID } from "node:crypto";

export type OrderStatus = "pending" | "fulfilled";
export interface OrderRecord {
  orderId: string;
  books: Record<string, number>;
  status: OrderStatus;
  createdAt: Date;
}

export interface OrdersData {
  create(books: Record<string, number>): Promise<string>;
  findById(orderId: string): Promise<OrderRecord | null>;
  listPending(): Promise<OrderRecord[]>;
  markFulfilled(orderId: string): Promise<boolean>;
}

export class InMemoryOrders implements OrdersData {
  private readonly orders = new Map<string, OrderRecord>();

  async create(books: Record<string, number>): Promise<string> {
    const orderId = randomUUID();
    this.orders.set(orderId, {
      orderId,
      books: { ...books },
      status: "pending",
      createdAt: new Date(),
    });
    return orderId;
  }

  async findById(orderId: string): Promise<OrderRecord | null> {
    const order = this.orders.get(orderId);
    return order ? { ...order, books: { ...order.books } } : null;
  }

  async listPending(): Promise<OrderRecord[]> {
    return [...this.orders.values()]
      .filter((order) => order.status === "pending")
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((order) => ({ ...order, books: { ...order.books } }));
  }

  async markFulfilled(orderId: string): Promise<boolean> {
    const order = this.orders.get(orderId);
    if (!order || order.status !== "pending") return false;
    order.status = "fulfilled";
    return true;
  }
}
