import previous_assignment from "./assignment-2";

export type BookID = string;

export interface Book {
  id?: BookID;
  name: string;
  author: string;
  description: string;
  price: number;
  image: string;
}

export interface Filter {
  from?: number;
  to?: number;
  name?: string;
  author?: string;
}

// If multiple filters are provided, any book that matches at least one of them should be returned.
// Within a single filter, a book would need to match all the given conditions.
async function listBooks(filters?: Filter[]): Promise<Book[]> {
  const query =
    filters
      ?.map((filter, index) => {
        const parts: string[] = [];

        if (typeof filter.from === "number") {
          parts.push(`filters[${index}][from]=${filter.from}`);
        }

        if (typeof filter.to === "number") {
          parts.push(`filters[${index}][to]=${filter.to}`);
        }

        if (typeof filter.name === "string") {
          parts.push(
            `filters[${index}][name]=${encodeURIComponent(filter.name)}`,
          );
        }

        if (typeof filter.author === "string") {
          parts.push(
            `filters[${index}][author]=${encodeURIComponent(filter.author)}`,
          );
        }

        return parts.join("&");
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
  return await previous_assignment.createOrUpdateBook(book);
}

async function removeBook(book: BookID): Promise<void> {
  await previous_assignment.removeBook(book);
}

const assignment = "assignment-3";

export default {
  assignment,
  createOrUpdateBook,
  removeBook,
  listBooks,
};
