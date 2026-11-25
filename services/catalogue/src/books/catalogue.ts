import { ObjectId, type Collection, type Filter as MongoFilter } from "mongodb";
import { HttpError } from "../shared/errors";

export interface BookDocument {
  name: string;
  author: string;
  description: string;
  price: number;
  image: string;
  stockTotal: number;
}
export interface Book extends BookDocument { id: string; }
export interface BookFilter { from?: number; to?: number; name?: string; author?: string; }

export interface BookCatalogue {
  findById(id: string): Promise<Book | null>;
  list(filters: BookFilter[]): Promise<Book[]>;
  create(book: Omit<BookDocument, "stockTotal">): Promise<Book>;
  update(id: string, book: Omit<BookDocument, "stockTotal">): Promise<Book | null>;
  delete(id: string): Promise<boolean>;
}

export function validateBook(body: unknown): Omit<BookDocument, "stockTotal"> {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new HttpError(400, "A book object is required.");
  }
  const data = body as Record<string, unknown>;
  if (
    typeof data.name !== "string" || !data.name.trim() ||
    typeof data.author !== "string" || !data.author.trim() ||
    typeof data.description !== "string" ||
    typeof data.image !== "string" ||
    typeof data.price !== "number" || !Number.isFinite(data.price) || data.price < 0
  ) {
    throw new HttpError(400, "Invalid book: provide name, author, description, image and a non-negative numeric price.");
  }
  return { name: data.name, author: data.author, description: data.description, price: data.price, image: data.image };
}
export function validBookId(id: string): boolean { return /^[0-9a-fA-F]{24}$/.test(id); }

function validRegex(text: string): string {
  if (text.length > 200) throw new HttpError(400, "Filter pattern is too long.");
  try { new RegExp(text, "i"); } catch { throw new HttpError(400, "Invalid regular expression in filter."); }
  return text;
}
export function parseFilters(raw: unknown): BookFilter[] {
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) throw new HttpError(400, "filters must be an array.");
  return raw.map((filter): BookFilter => {
    if (typeof filter !== "object" || filter === null || Array.isArray(filter)) {
      throw new HttpError(400, "Each filter must be an object.");
    }
    const v = filter as Record<string, unknown>;
    const out: BookFilter = {};
    for (const key of Object.keys(v)) if (!["from","to","name","author"].includes(key)) throw new HttpError(400, `Unknown filter property: ${key}`);
    for (const key of ["from","to"] as const) if (v[key] !== undefined) {
      const n = Number(v[key]);
      if (typeof v[key] === "boolean" || v[key] === "" || !Number.isFinite(n) || n < 0) throw new HttpError(400, `${key} must be a non-negative number.`);
      out[key] = n;
    }
    if (out.from !== undefined && out.to !== undefined && out.from > out.to) throw new HttpError(400, "from must be less than or equal to to.");
    for (const key of ["name","author"] as const) if (v[key] !== undefined) {
      if (typeof v[key] !== "string") throw new HttpError(400, `${key} must be a string.`);
      out[key] = validRegex(v[key]);
    }
    return out;
  });
}
function queryFor(filters: BookFilter[]): MongoFilter<BookDocument> {
  if (!filters.length) return {};
  return {$or: filters.map((f) => {
    const q: MongoFilter<BookDocument> = {};
    if (f.from !== undefined || f.to !== undefined) q.price = {...(f.from !== undefined ? {$gte:f.from}:{}), ...(f.to !== undefined ? {$lte:f.to}:{})};
    if (f.name !== undefined) q.name = {$regex: validRegex(f.name), $options:"i"};
    if (f.author !== undefined) q.author = {$regex: validRegex(f.author), $options:"i"};
    return q;
  })};
}

export class MongoBookCatalogue implements BookCatalogue {
  constructor(private readonly books: Collection<BookDocument>) {}
  async findById(id: string): Promise<Book | null> {
    if (!validBookId(id)) return null;
    const b = await this.books.findOne({_id:new ObjectId(id)});
    return b ? {...b, id:b._id.toHexString()} : null;
  }
  async list(filters: BookFilter[]): Promise<Book[]> {
    const docs = await this.books.find(queryFor(filters)).toArray();
    return docs.map(({_id, ...b}) => ({...b, id:_id.toHexString()}));
  }
  async create(book: Omit<BookDocument,"stockTotal">): Promise<Book> {
    const doc = {...book, stockTotal:0};
    const r = await this.books.insertOne(doc);
    return {...doc, id:r.insertedId.toHexString()};
  }
  async update(id: string, book: Omit<BookDocument,"stockTotal">): Promise<Book|null> {
    if (!validBookId(id)) return null;
    const existing = await this.findById(id);
    if (!existing) return null;
    await this.books.updateOne({_id:new ObjectId(id)}, {$set:book});
    return {...existing, ...book};
  }
  async delete(id: string): Promise<boolean> {
    if (!validBookId(id)) return false;
    return (await this.books.deleteOne({_id:new ObjectId(id)})).deletedCount === 1;
  }
}