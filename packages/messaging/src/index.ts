import amqp, {
  type Channel,
  type ConsumeMessage,
  type Connection,
} from "amqplib";

export const EXCHANGE = "mcmasterful.events";

export type BookChangedEvent = {
  type: "BookAdded" | "BookUpdated";
  book: {
    id: string;
    name: string;
    author: string;
    description: string;
    price: number;
    image: string;
  };
};

export type BookDeletedEvent = { type: "BookDeleted"; bookId: string };

export type StockChangedEvent = {
  type: "BookStockChanged";
  bookId: string;
  shelf: string;
  delta: number;
  stockTotal: number;
};

export type OrderPlacedEvent = {
  type: "OrderPlaced";
  orderId: string;
  books: Record<string, number>;
};

export type FulfillmentRequestedEvent = {
  type: "OrderFulfillmentRequested";
  orderId: string;
  fulfillment: Array<{ book: string; shelf: string; numberOfBooks: number }>;
};

export type FulfillmentResultEvent =
  | {
      type: "OrderFulfillmentCompleted";
      orderId: string;
      books: Record<string, number>;
    }
  | {
      type: "OrderFulfillmentFailed";
      orderId: string;
      reason: string;
    };

export type Event =
  | BookChangedEvent
  | BookDeletedEvent
  | StockChangedEvent
  | OrderPlacedEvent
  | FulfillmentRequestedEvent
  | FulfillmentResultEvent
  | { type: "OrderFulfilled"; orderId: string; books: Record<string, number> };

export async function connectEventBus(url = process.env.RABBITMQ_URL ?? "amqp://rabbitmq") {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 30; attempt += 1) {
    try {
      const connection = await amqp.connect(url);
      const channel = await connection.createChannel();
      await channel.assertExchange(EXCHANGE, "topic", { durable: true });
      return { connection, channel };
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  throw lastError;
}

export async function publish(channel: Channel, event: Event): Promise<void> {
  channel.publish(EXCHANGE, event.type, Buffer.from(JSON.stringify(event)), {
    persistent: true,
    contentType: "application/json",
  });
}

export async function subscribe(
  channel: Channel,
  serviceName: string,
  routingKeys: string[],
  handler: (event: Event) => Promise<void>,
): Promise<void> {
  const queue = await channel.assertQueue(`${serviceName}.events`, {
    durable: true,
  });
  for (const key of routingKeys) {
    await channel.bindQueue(queue.queue, EXCHANGE, key);
  }
  await channel.consume(queue.queue, async (message: ConsumeMessage | null) => {
    if (!message) return;
    try {
      await handler(JSON.parse(message.content.toString()) as Event);
      channel.ack(message);
    } catch (error) {
      console.error(`Event handler failed in ${serviceName}:`, error);
      channel.nack(message, false, false);
    }
  });
}
