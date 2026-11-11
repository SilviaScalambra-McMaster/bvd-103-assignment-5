import { randomUUID } from "node:crypto";
import { type Collection } from "mongodb";
import { type OrderRecord, type OrdersData } from "./orders_data";

export interface OrderDocument extends Omit<OrderRecord, "orderId"> {
  _id: string;
}

export class DatabaseOrders implements OrdersData {
  constructor(private readonly orders: Collection<OrderDocument>) {}

  async ensureIndexes(): Promise<void> {
    await this.orders.createIndex({ status: 1, createdAt: 1 });
  }

  async create(books: Record<string, number>): Promise<string> {
    const orderId = randomUUID();
    await this.orders.insertOne({
      _id: orderId,
      books: { ...books },
      status: "pending",
      createdAt: new Date(),
    });
    return orderId;
  }

  async findById(orderId: string): Promise<OrderRecord | null> {
    const order = await this.orders.findOne({ _id: orderId });
    return order
      ? {
          orderId: order._id,
          books: { ...order.books },
          status: order.status,
          createdAt: order.createdAt,
        }
      : null;
  }

  async listPending(): Promise<OrderRecord[]> {
    const records = await this.orders
      .find({ status: "pending" })
      .sort({ createdAt: 1, _id: 1 })
      .toArray();
    return records.map(({ _id, books, status, createdAt }) => ({
      orderId: _id,
      books: { ...books },
      status,
      createdAt,
    }));
  }

  async markFulfilled(orderId: string): Promise<boolean> {
    const result = await this.orders.updateOne(
      { _id: orderId, status: "pending" },
      { $set: { status: "fulfilled" } },
    );
    return result.modifiedCount === 1;
  }
}
