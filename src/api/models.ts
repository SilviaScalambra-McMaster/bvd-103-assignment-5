/**
 * Public contract for the McMasterful Partners Program.
 * These interfaces are the single source of truth for generated OpenAPI schemas.
 */
export interface BookInput {
  /** @minLength 1 */
  name: string;
  /** @minLength 1 */
  author: string;
  description: string;
  /** @minimum 0 */
  price: number;
  image: string;
}

export interface BookResponse extends BookInput {
  /** MongoDB ObjectId represented as 24 hexadecimal characters. */
  id: string;
  /** Total copies currently on warehouse shelves. */
  stock: number;
}

/** Each filter matches on all provided fields; multiple filters combine with OR. */
export interface BookFilterInput {
  /**
   * Inclusive minimum price.
   * @minimum 0
   */
  from?: number;
  /**
   * Inclusive maximum price.
   * @minimum 0
   */
  to?: number;
  /** Case-insensitive regular expression matched against the book title. */
  name?: string;
  /** Case-insensitive regular expression matched against the author. */
  author?: string;
}

export interface SearchBooksRequest {
  filters: BookFilterInput[];
}

export interface ShelfPlacement {
  /** Existing book's 24-hex-digit identifier. */
  bookId: string;
  /**
   * @isInt
   * @minimum 1
   */
  numberOfBooks: number;
  /** @minLength 1 */
  shelf: string;
}

export interface ShelfLocation {
  shelf: string;
  count: number;
}

export interface PlaceOrderRequest {
  /**
   * Book identifiers, one entry per copy. Duplicates represent multiple copies.
   * @minItems 1
   */
  books: string[];
}

export interface PlaceOrderResponse {
  orderId: string;
}

export interface PendingOrder {
  orderId: string;
  books: { [key: string]: number };
}

export interface FulfillmentItem {
  /** Book identifier being fulfilled. */
  book: string;
  /**
   * Existing shelf identifier.
   * @minLength 1
   */
  shelf: string;
  /**
   * @isInt
   * @minimum 1
   */
  numberOfBooks: number;
}

export interface FulfillmentRequest {
  /**
   * At least one shelf selection is needed.
   * @minItems 1
   */
  fulfillment: FulfillmentItem[];
}

export interface ErrorResponse {
  error: string;
  details?: Record<string, { message: string }>;
}
