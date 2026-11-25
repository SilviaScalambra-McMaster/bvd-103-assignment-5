import type Koa from "koa";import {Body,Controller,Get,Path,Post,Request,Response,Route,SuccessResponse,Tags} from "tsoa";import {servicesFrom} from "./services";import type {PlaceOrderRequest,PlaceOrderResponse,PendingOrder,FulfillmentRequest,ErrorResponse} from "./models";
@Route("orders")@Tags("Orders")@Response<ErrorResponse>(400,"Invalid request")@Response<ErrorResponse>(404,"Order not found")@Response<ErrorResponse>(409,"Conflict")
export class OrdersController extends Controller{
 @Post()@SuccessResponse("201","Order placed")async placeOrder(@Body()body:PlaceOrderRequest,@Request()request:Koa.Request):Promise<PlaceOrderResponse>{const r=await servicesFrom(request).orders.placeOrder(body.books);this.setStatus(201);return r;}
 @Get()async listOrders(@Request()request:Koa.Request):Promise<PendingOrder[]>{return servicesFrom(request).orders.listOrders();}
 @Post("{orderId}/fulfill")@SuccessResponse("204","Order fulfilled")async fulfilOrder(@Path()orderId:string,@Body()body:FulfillmentRequest,@Request()request:Koa.Request):Promise<void>{await servicesFrom(request).orders.fulfilOrder(orderId,body.fulfillment);this.setStatus(204);}
}
