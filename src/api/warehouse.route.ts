import type Koa from "koa";
import {
  Body,
  Controller,
  Get,
  OperationId,
  Path,
  Post,
  Request,
  Response,
  Route,
  SuccessResponse,
  Tags,
} from "tsoa";
import { servicesFrom } from "./services";
import type { ErrorResponse, ShelfLocation, ShelfPlacement } from "./models";

/** Manage the physical location and quantity of stock. */
@Route("warehouse")
@Tags("Warehouse")
@Response<ErrorResponse>(400, "Invalid shelf placement")
@Response<ErrorResponse>(404, "Book not found")
export class WarehouseController extends Controller {
  /**
   * Add copies of an existing book to the named warehouse shelf. Subsequent
   * deliveries to the same shelf increase its stored count.
   * @summary Place books on a shelf
   */
  @Post("shelves")
  @OperationId("placeBooksOnShelf")
  @SuccessResponse("204", "Books placed on shelf")
  public async placeBooksOnShelf(
    @Body() body: ShelfPlacement,
    @Request() request: Koa.Request,
  ): Promise<void> {
    await servicesFrom(request).warehouse.placeBooksOnShelf(
      body.bookId,
      body.numberOfBooks,
      body.shelf,
    );
    this.setStatus(204);
  }

  /**
   * Find shelf locations and positive copy counts for an existing book.
   * @summary Locate a book in the warehouse
   */
  @Get("books/{bookId}/locations")
  @OperationId("getBookLocations")
  public async getBookLocations(
    @Path() bookId: string,
    @Request() request: Koa.Request,
  ): Promise<ShelfLocation[]> {
    return servicesFrom(request).warehouse.getLocations(bookId);
  }
}
