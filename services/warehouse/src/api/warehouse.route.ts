import type Koa from "koa";
import {Body,Controller,Get,Path,Post,Request,Response,Route,SuccessResponse,Tags} from "tsoa";
import {servicesFrom} from "./services"; import type {ShelfPlacement,ShelfLocation,ErrorResponse} from "./models";
@Route("warehouse") @Tags("Warehouse") @Response<ErrorResponse>(400,"Invalid request") @Response<ErrorResponse>(404,"Book not found")
export class WarehouseController extends Controller {
 @Post("shelves") @SuccessResponse("204","Books placed on shelf")
 async placeBooksOnShelf(@Body() body:ShelfPlacement,@Request() request:Koa.Request):Promise<void>{await servicesFrom(request).warehouse.placeBooksOnShelf(body.bookId,body.numberOfBooks,body.shelf);this.setStatus(204);}
 @Get("books/{bookId}/locations")
 async getBookLocations(@Path() bookId:string,@Request() request:Koa.Request):Promise<ShelfLocation[]>{return servicesFrom(request).warehouse.getLocations(bookId);}
}
