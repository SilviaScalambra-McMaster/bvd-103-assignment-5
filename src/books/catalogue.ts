import { ObjectId, type Collection, type Filter as MongoFilter } from "mongodb";
import { HttpError } from "../shared/errors";
import { type BookDocument } from "./database";

export interface Book extends BookDocument {
  id: string;
  stock?: number;
}

export interface BookFilter {
  from?: number;
  to?: number;
  name?: string;
  author?: string;
}

export interface BookCatalogue {
  findById(id: string): Promise<Book | null>;
  list(filters: BookFilter[]): Promise<Book[]>;
  create(book: BookDocument): Promise<Book>;
  update(id: string, book: BookDocument): Promise<Book | null>;
  delete(id: string): Promise<boolean>;
}

export function validateBook(body: unknown): BookDocument {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new HttpError(400, "A book object is required.");
  }
  const data = body as Record<string, unknown>;
  const name = data.name;
  const author = data.author;
  const description = data.description;
  const image = data.image;
  const price = data.price;
  if (
    typeof name !== "string" ||
    !name.trim() ||
    typeof author !== "string" ||
    !author.trim() ||
    typeof description !== "string" ||
    typeof image !== "string" ||
    typeof price !== "number" ||
    !Number.isFinite(price) ||
    price < 0
  ) {
    throw new HttpError(
      400,
      "Invalid book: provide name, author, description, image and a non-negative numeric price.",
    );
  }
  return { name, author, description, price, image };
}

export function validBookId(id: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

export function parseFilters(raw: unknown): BookFilter[] {
  if (raw === undefined) return [];
  if (!Array.isArray(raw))
    throw new HttpError(400, "filters must be an array.");
  return raw.map((filter): BookFilter => {
    if (
      typeof filter !== "object" ||
      filter === null ||
      Array.isArray(filter)
    ) {
      throw new HttpError(400, "Each filter must be an object.");
    }
    const values = filter as Record<string, unknown>;
    const result: BookFilter = {};
    for (const key of Object.keys(values)) {
      if (!["from", "to", "name", "author"].includes(key)) {
        throw new HttpError(400, `Unknown filter property: ${key}`);
      }
    }
    for (const key of ["from", "to"] as const) {
      if (values[key] !== undefined) {
        const n = Number(values[key]);
        if (
          typeof values[key] === "boolean" ||
          values[key] === "" ||
          !Number.isFinite(n) ||
          n < 0
        ) {
          throw new HttpError(400, `${key} must be a non-negative number.`);
        }
        result[key] = n;
      }
    }
    if (
      result.from !== undefined &&
      result.to !== undefined &&
      result.from > result.to
    ) {
      throw new HttpError(400, "from must be less than or equal to to.");
    }
    for (const key of ["name", "author"] as const) {
      if (values[key] !== undefined) {
        if (typeof values[key] !== "string") {
          throw new HttpError(400, `${key} must be a string.`);
        }
        result[key] = validRegexPattern(values[key]);
      }
    }
    return result;
  });
}

// Preserve Assignment 3 regex filters, while rejecting malformed or huge patterns.
function validRegexPattern(text: string): string {
  if (text.length > 200)
    throw new HttpError(400, "Filter pattern is too long.");
  try {
    new RegExp(text, "i");
  } catch {
    throw new HttpError(400, "Invalid regular expression in filter.");
  }
  return text;
}

function queryFor(filters: BookFilter[]): MongoFilter<BookDocument> {
  if (!filters.length) return {};
  return {
    $or: filters.map((filter) => {
      const entry: MongoFilter<BookDocument> = {};
      if (filter.from !== undefined || filter.to !== undefined) {
        entry.price = {
          ...(filter.from !== undefined ? { $gte: filter.from } : {}),
          ...(filter.to !== undefined ? { $lte: filter.to } : {}),
        };
      }
      if (filter.name !== undefined)
        entry.name = { $regex: validRegexPattern(filter.name), $options: "i" };
      if (filter.author !== undefined)
        entry.author = {
          $regex: validRegexPattern(filter.author),
          $options: "i",
        };
      return entry;
    }),
  };
}

export class MongoBookCatalogue implements BookCatalogue {
  constructor(private readonly books: Collection<BookDocument>) {}

  async findById(id: string): Promise<Book | null> {
    if (!validBookId(id)) return null;
    const book = await this.books.findOne({ _id: new ObjectId(id) });
    return book
      ? {
          id: book._id.toHexString(),
          name: book.name,
          author: book.author,
          description: book.description,
          price: book.price,
          image: book.image,
        }
      : null;
  }

  async list(filters: BookFilter[]): Promise<Book[]> {
    const books = await this.books.find(queryFor(filters)).toArray();
    return books.map(({ _id, name, author, description, price, image }) => ({
      id: _id.toHexString(),
      name,
      author,
      description,
      price,
      image,
    }));
  }

  async create(book: BookDocument): Promise<Book> {
    const result = await this.books.insertOne(book);
    return { ...book, id: result.insertedId.toHexString() };
  }

  async update(id: string, book: BookDocument): Promise<Book | null> {
    if (!validBookId(id)) return null;
    const result = await this.books.updateOne(
      { _id: new ObjectId(id) },
      { $set: book },
    );
    return result.matchedCount ? { ...book, id } : null;
  }

  async delete(id: string): Promise<boolean> {
    if (!validBookId(id)) return false;
    const result = await this.books.deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount === 1;
  }
}
