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
import type {
  ErrorResponse,
  FulfillmentRequest,
  PendingOrder,
  PlaceOrderRequest,
  PlaceOrderResponse,
} from "./models";

/** Place and fulfil orders for catalogue books. */
@Route("orders")
@Tags("Orders")
@Response<ErrorResponse>(400, "Invalid order or fulfillment")
@Response<ErrorResponse>(404, "Order not found")
@Response<ErrorResponse>(409, "Insufficient stock or order already fulfilled")
export class OrdersController extends Controller {
  /**
   * Place an order for existing catalogue books. A book may appear more than
   * once in the array to request multiple copies, even if stock is unavailable.
   * @summary Place an order
   */
  @Post()
  @OperationId("placeOrder")
  @SuccessResponse("201", "Order placed")
  public async placeOrder(
    @Body() body: PlaceOrderRequest,
    @Request() request: Koa.Request,
  ): Promise<PlaceOrderResponse> {
    const created = await servicesFrom(request).orders.placeOrder(body.books);
    this.setStatus(201);
    return created;
  }

  /**
   * Only pending orders are returned; fulfilled orders are omitted.
   * @summary List pending orders
   */
  @Get()
  @OperationId("listOrders")
  public async listOrders(
    @Request() request: Koa.Request,
  ): Promise<PendingOrder[]> {
    return servicesFrom(request).orders.listOrders();
  }

  /**
   * Mark an order fulfilled using exact ordered quantities from existing
   * shelves. Requests with insufficient stock do not consume inventory.
   * @summary Fulfil an order from shelf stock
   */
  @Post("{orderId}/fulfill")
  @OperationId("fulfilOrder")
  @SuccessResponse("204", "Order fulfilled")
  public async fulfilOrder(
    @Path() orderId: string,
    @Body() body: FulfillmentRequest,
    @Request() request: Koa.Request,
  ): Promise<void> {
    await servicesFrom(request).orders.fulfilOrder(orderId, body.fulfillment);
    this.setStatus(204);
  }
}
