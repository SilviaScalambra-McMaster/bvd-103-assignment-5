import type Koa from "koa";
import { Body, Controller, Delete, Get, Path, Post, Put, Query, Request, Response, Route, SuccessResponse, Tags } from "tsoa";
import { parseFilters, validBookId, validateBook } from "../books/catalogue";
import { HttpError } from "../shared/errors";
import { servicesFrom } from "./services";
import type { BookFilterInput, BookInput, BookResponse, ErrorResponse, SearchBooksRequest } from "./models";

@Route("books")
@Tags("Catalogue")
@Response<ErrorResponse>(400, "Invalid request")
@Response<ErrorResponse>(404, "Book not found")
export class BooksController extends Controller {
  @Get()
  public async listBooks(@Request() request: Koa.Request, @Query() name?: string, @Query() author?: string, @Query() from?: number, @Query() to?: number): Promise<BookResponse[]> {
    const legacy = parseFilters(request.ctx.query.filters);
    const flat: BookFilterInput = {};
    if (name !== undefined) flat.name=name; if (author !== undefined) flat.author=author; if (from !== undefined) flat.from=from; if (to !== undefined) flat.to=to;
    const filters = [...legacy, ...(Object.keys(flat).length ? [flat] : [])];
    const books = await servicesFrom(request).catalogue.list(parseFilters(filters));
    return books.map((b)=>({...b, stock:b.stockTotal}));
  }

  @Post("search")
  public async searchBooks(@Body() body: SearchBooksRequest, @Request() request: Koa.Request): Promise<BookResponse[]> {
    const books = await servicesFrom(request).catalogue.list(parseFilters(body.filters));
    return books.map((b)=>({...b, stock:b.stockTotal}));
  }

  @Get("{id}")
  public async getBook(@Path() id:string, @Request() request:Koa.Request):Promise<BookResponse> {
    if (!validBookId(id)) throw new HttpError(400,"Invalid book ID.");
    const b = await servicesFrom(request).catalogue.findById(id);
    if (!b) throw new HttpError(404,"Book not found.");
    return {...b, stock:b.stockTotal};
  }

  @Post()
  @SuccessResponse("201","Book created")
  public async createBook(@Body() body:BookInput,@Request() request:Koa.Request):Promise<BookResponse> {
    const b=await servicesFrom(request).catalogue.create(validateBook(body));
    await servicesFrom(request).publish({type:"BookAdded",book:{...b}});
    this.setStatus(201);
    return {...b,stock:0};
  }

  @Put("{id}")
  public async updateBook(@Path() id:string,@Body() body:BookInput,@Request() request:Koa.Request):Promise<BookResponse> {
    if (!validBookId(id)) throw new HttpError(400,"Invalid book ID.");
    const b=await servicesFrom(request).catalogue.update(id,validateBook(body));
    if (!b) throw new HttpError(404,"Book not found.");
    await servicesFrom(request).publish({type:"BookUpdated",book:{...b}});
    return {...b,stock:b.stockTotal};
  }

  @Delete("{id}")
  @SuccessResponse("204","Book deleted")
  public async deleteBook(@Path() id:string,@Request() request:Koa.Request):Promise<void> {
    if (!validBookId(id)) throw new HttpError(400,"Invalid book ID.");
    if (!(await servicesFrom(request).catalogue.delete(id))) throw new HttpError(404,"Book not found.");
    await servicesFrom(request).publish({type:"BookDeleted",bookId:id});
    this.setStatus(204);
  }
}
