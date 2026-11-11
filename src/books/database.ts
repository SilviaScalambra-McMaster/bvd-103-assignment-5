import { type Collection } from "mongodb";
import { getMongoClient, mongoDatabaseName } from "../storage/mongo";

export interface BookDocument {
  name: string;
  author: string;
  description: string;
  price: number;
  image: string;
}

export async function getBooksCollection(): Promise<Collection<BookDocument>> {
  const client = getMongoClient();
  return client
    .db(mongoDatabaseName("catalogue"))
    .collection<BookDocument>("books");
}
