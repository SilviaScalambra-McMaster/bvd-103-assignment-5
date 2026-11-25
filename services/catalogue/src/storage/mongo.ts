import { MongoClient, type Collection } from "mongodb";
import type { BookDocument } from "../books/catalogue";
let client: MongoClient | undefined;
export function getMongoClient(): MongoClient {
  if (!client) client = new MongoClient(process.env.MONGO_URI ?? "mongodb://catalogue-mongo:27017");
  return client;
}
export async function getBooksCollection(): Promise<Collection<BookDocument>> {
  return getMongoClient().db("catalogue").collection<BookDocument>("books");
}
export async function closeMongoClient(): Promise<void> { if (client) { await client.close(); client=undefined; } }
