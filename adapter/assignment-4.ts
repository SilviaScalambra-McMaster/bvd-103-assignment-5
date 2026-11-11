import previousAssignment from "./assignment-3";

export type BookID = string;
export interface Book {
  id?: BookID;
  name: string;
  author: string;
  description: string;
  price: number;
  image: string;
  stock?: number;
}
export interface Filter {
  from?: number;
  to?: number;
  name?: string;
  author?: string;
}
export type ShelfId = string;
export type OrderId = string;

const baseUrl = "http://localhost:3000";

async function checkedResponse(
  response: Response,
  operation: string,
): Promise<Response> {
  if (!response.ok) {
    throw new Error(
      `${operation} failed (${response.status}): ${await response.text()}`,
    );
  }
  return response;
}

async function listBooks(filters?: Filter[]): Promise<Book[]> {
  // The Assignment 3 HTTP query syntax stays unchanged; the server now includes stock.
  return previousAssignment.listBooks(filters);
}

async function createOrUpdateBook(book: Book): Promise<BookID> {
  return previousAssignment.createOrUpdateBook(book);
}

async function removeBook(book: BookID): Promise<void> {
  await previousAssignment.removeBook(book);
}

async function lookupBookById(book: BookID): Promise<Book> {
  const response = await checkedResponse(
    await fetch(`${baseUrl}/books/${encodeURIComponent(book)}`),
    "Lookup book",
  );
  return (await response.json()) as Book;
}

async function placeBooksOnShelf(
  bookId: BookID,
  numberOfBooks: number,
  shelf: ShelfId,
): Promise<void> {
  await checkedResponse(
    await fetch(`${baseUrl}/warehouse/shelves`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookId, numberOfBooks, shelf }),
    }),
    "Place books on shelf",
  );
}

async function orderBooks(order: BookID[]): Promise<{ orderId: OrderId }> {
  const response = await checkedResponse(
    await fetch(`${baseUrl}/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ books: order }),
    }),
    "Place order",
  );
  return (await response.json()) as { orderId: OrderId };
}

async function findBookOnShelf(
  book: BookID,
): Promise<Array<{ shelf: ShelfId; count: number }>> {
  const response = await checkedResponse(
    await fetch(
      `${baseUrl}/warehouse/books/${encodeURIComponent(book)}/locations`,
    ),
    "Find book on shelf",
  );
  return (await response.json()) as Array<{ shelf: ShelfId; count: number }>;
}

async function fulfilOrder(
  order: OrderId,
  booksFulfilled: Array<{
    book: BookID;
    shelf: ShelfId;
    numberOfBooks: number;
  }>,
): Promise<void> {
  await checkedResponse(
    await fetch(`${baseUrl}/orders/${encodeURIComponent(order)}/fulfill`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fulfillment: booksFulfilled }),
    }),
    "Fulfil order",
  );
}

async function listOrders(): Promise<
  Array<{ orderId: OrderId; books: Record<BookID, number> }>
> {
  const response = await checkedResponse(
    await fetch(`${baseUrl}/orders`),
    "List orders",
  );
  return (await response.json()) as Array<{
    orderId: OrderId;
    books: Record<BookID, number>;
  }>;
}

const assignment = "assignment-4";
export default {
  assignment,
  createOrUpdateBook,
  removeBook,
  listBooks,
  placeBooksOnShelf,
  orderBooks,
  findBookOnShelf,
  fulfilOrder,
  listOrders,
  lookupBookById,
};
