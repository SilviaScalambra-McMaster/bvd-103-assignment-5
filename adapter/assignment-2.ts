export type BookID = string;

export interface Book {
  id?: BookID;
  name: string;
  author: string;
  description: string;
  price: number;
  image: string;
}

async function listBooks(
  filters?: Array<{ from?: number; to?: number }>,
): Promise<Book[]> {
  const query =
    filters
      ?.map(({ from, to }, index) => {
        let result = "";

        if (typeof from === "number") {
          result += `filters[${index}][from]=${from}`;
        }

        if (typeof to === "number") {
          if (result) {
            result += "&";
          }

          result += `filters[${index}][to]=${to}`;
        }

        return result;
      })
      .filter(Boolean)
      .join("&") ?? "";

  const response = await fetch(
    `http://localhost:3000/books${query ? `?${query}` : ""}`,
  );

  if (!response.ok) {
    throw new Error(
      `Failed to load books: ${response.status} ${response.statusText}`,
    );
  }

  return (await response.json()) as Book[];
}

async function createOrUpdateBook(book: Book): Promise<BookID> {
  const isUpdate = typeof book.id === "string" && book.id.length > 0;

  const url = isUpdate
    ? `http://localhost:3000/books/${book.id}`
    : "http://localhost:3000/books";

  const response = await fetch(url, {
    method: isUpdate ? "PUT" : "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: book.name,
      author: book.author,
      description: book.description,
      price: book.price,
      image: book.image,
    }),
  });

  if (!response.ok) {
    const error = await response.text();

    throw new Error(
      `Failed to ${isUpdate ? "update" : "create"} book: ${response.status} ${error}`,
    );
  }

  const result = (await response.json()) as Book;

  if (!result.id) {
    throw new Error("The server did not return a book ID.");
  }

  return result.id;
}

async function removeBook(book: BookID): Promise<void> {
  const response = await fetch(`http://localhost:3000/books/${book}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.text();

    throw new Error(`Failed to delete book: ${response.status} ${error}`);
  }
}

const assignment = "assignment-2";

export default {
  assignment,
  createOrUpdateBook,
  removeBook,
  listBooks,
};
