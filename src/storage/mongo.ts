import { MongoClient } from "mongodb";

// The three bounded contexts use separate databases, even on the same server.
// Do not put connection strings or credentials in source control.
let client: MongoClient | undefined;

export function getMongoClient(): MongoClient {
  if (!client) {
    client = new MongoClient(process.env.MONGO_URI ?? "mongodb://mongo:27017");
  }
  return client;
}

export function mongoDatabaseName(
  context: "catalogue" | "warehouse" | "orders",
): string {
  return `${process.env.MONGO_DB_PREFIX ?? "mcmasterful"}_${context}`;
}

export async function closeMongoClient(): Promise<void> {
  if (client) {
    await client.close();
    client = undefined;
  }
}
