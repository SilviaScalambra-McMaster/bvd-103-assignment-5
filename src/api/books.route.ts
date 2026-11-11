import type Koa from "koa";
import {
  Body,
  Controller,
  Delete,
  Example,
  Get,
  OperationId,
  Path,
  Post,
  Put,
  Query,
  Request,
  Response,
  Route,
  SuccessResponse,
  Tags,
} from "tsoa";
import { parseFilters, validBookId, validateBook } from "../books/catalogue";
import { HttpError } from "../shared/errors";
import { servicesFrom } from "./services";
import type {
  BookFilterInput,
  BookInput,
  BookResponse,
  ErrorResponse,
  SearchBooksRequest,
} from "./models";

/** Create, search, update and delete titles in the catalogue. */
@Route("books")
@Tags("Books")
@Response<ErrorResponse>(400, "Invalid request")
@Response<ErrorResponse>(404, "Book not found")
export class BooksController extends Controller {
  /**
   * Get books with stock totals. Query parameters on this endpoint are combined
   * with AND. Legacy `filters[0][name]`-style query arrays are also accepted,
   * using OR between filters. Partners should use POST /books/search for OR.
   * @summary List books in the catalogue
   */
  @Get()
  @OperationId("listBooks")
  @Example<BookResponse[]>([
    {
      id: "507f1f77bcf86cd799439011",
      name: "A Test Novel",
      author: "A Writer",
      description: "A book about testing.",
      price: 12,
      image: "https://example.org/book.jpg",
      stock: 3,
    },
  ])
  public async listBooks(
    @Request() request: Koa.Request,
    @Query() name?: string,
    @Query() author?: string,
    @Query() from?: number,
    @Query() to?: number,
  ): Promise<BookResponse[]> {
    const legacyFilters = parseFilters(request.ctx.query.filters);
    const flatFilter: BookFilterInput = {};
    if (name !== undefined) flatFilter.name = name;
    if (author !== undefined) flatFilter.author = author;
    if (from !== undefined) flatFilter.from = from;
    if (to !== undefined) flatFilter.to = to;
    const filters = [
      ...legacyFilters,
      ...(Object.keys(flatFilter).length ? [flatFilter] : []),
    ];
    const { catalogue, warehouse } = servicesFrom(request);
    // Run the same domain validation for both legacy and documented query filters.
    const validFilters = parseFilters(filters);
    const books = await catalogue.list(validFilters);
    return Promise.all(
      books.map(async (book) => ({
        ...book,
        stock: await warehouse.getStock(book.id),
      })),
    );
  }

  /**
   * Use this endpoint when combining multiple filter groups with OR.
   * Each individual filter matches all supplied properties (AND).
   * An empty filters array returns all catalogue books.
   * @summary Search books using OR filters
   */
  @Post("search")
  @OperationId("searchBooks")
  public async searchBooks(
    @Body() body: SearchBooksRequest,
    @Request() request: Koa.Request,
  ): Promise<BookResponse[]> {
    const { catalogue, warehouse } = servicesFrom(request);
    const books = await catalogue.list(parseFilters(body.filters));
    return Promise.all(
      books.map(async (book) => ({
        ...book,
        stock: await warehouse.getStock(book.id),
      })),
    );
  }

  /**
   * Return the details of one book, including the quantity of stock across all
   * warehouse shelves.
   * @summary Get a book and current stock
   * @example id "507f1f77bcf86cd799439011"
   */
  @Get("{id}")
  @OperationId("getBook")
  @Example<BookResponse>({
    id: "507f1f77bcf86cd799439011",
    name: "A Test Novel",
    author: "A Writer",
    description: "A book about testing.",
    price: 12,
    image: "https://example.org/book.jpg",
    stock: 3,
  })
  public async getBook(
    @Path() id: string,
    @Request() request: Koa.Request,
  ): Promise<BookResponse> {
    if (!validBookId(id)) throw new HttpError(400, "Invalid book ID.");
    const { catalogue, warehouse } = servicesFrom(request);
    const book = await catalogue.findById(id);
    if (!book) throw new HttpError(404, "Book not found.");
    return { ...book, stock: await warehouse.getStock(book.id) };
  }

  /**
   * Create a new title. Price must be nonnegative and the name/author nonempty.
   * @summary Create a book
   */
  @Post()
  @OperationId("createBook")
  @SuccessResponse("201", "Book created")
  public async createBook(
    @Body() body: BookInput,
    @Request() request: Koa.Request,
  ): Promise<BookResponse> {
    const { catalogue } = servicesFrom(request);
    const book = await catalogue.create(validateBook(body));
    this.setStatus(201);
    return { ...book, stock: 0 };
  }

  /**
   * Replace a book's metadata without changing its warehouse inventory.
   * @summary Update a book
   */
  @Put("{id}")
  @OperationId("updateBook")
  public async updateBook(
    @Path() id: string,
    @Body() body: BookInput,
    @Request() request: Koa.Request,
  ): Promise<BookResponse> {
    if (!validBookId(id)) throw new HttpError(400, "Invalid book ID.");
    const { catalogue, warehouse } = servicesFrom(request);
    const updated = await catalogue.update(id, validateBook(body));
    if (!updated) throw new HttpError(404, "Book not found.");
    return { ...updated, stock: await warehouse.getStock(updated.id) };
  }

  /**
   * Remove a title by its identifier.
   * @summary Delete a book
   */
  @Delete("{id}")
  @OperationId("deleteBook")
  @SuccessResponse("204", "Book deleted")
  public async deleteBook(
    @Path() id: string,
    @Request() request: Koa.Request,
  ): Promise<void> {
    if (!validBookId(id)) throw new HttpError(400, "Invalid book ID.");
    const { catalogue } = servicesFrom(request);
    if (!(await catalogue.delete(id)))
      throw new HttpError(404, "Book not found.");
    this.setStatus(204);
  }
}
