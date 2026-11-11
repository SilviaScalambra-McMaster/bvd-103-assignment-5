import Koa from "koa";
import cors from "@koa/cors";
import bodyParser from "koa-bodyparser";
import qs from "koa-qs";
import Router from "@koa/router";
import { koaSwagger } from "koa2-swagger-ui";
import { ValidateError } from "tsoa";
import { RegisterRoutes } from "../build/routes";
import swagger from "../build/swagger.json";
import type { BookCatalogue } from "./books/catalogue";
import { MongoBookCatalogue } from "./books/catalogue";
import { getBooksCollection } from "./books/database";
import { HttpError } from "./shared/errors";
import { getMongoClient, mongoDatabaseName } from "./storage/mongo";
import {
  DatabaseWarehouse,
  type InventoryDocument,
} from "./warehouse/warehouse_database";
import { WarehouseService } from "./warehouse/warehouse_service";
import { DatabaseOrders, type OrderDocument } from "./orders/orders_database";
import { OrdersService } from "./orders/orders_service";

export interface Services {
  catalogue: BookCatalogue;
  warehouse: WarehouseService;
  orders: OrdersService;
}

interface AppState {
  services: Services;
}

export async function createMongoServices(): Promise<Services> {
  const client = getMongoClient();
  const catalogue = new MongoBookCatalogue(await getBooksCollection());
  const warehouseData = new DatabaseWarehouse(
    client
      .db(mongoDatabaseName("warehouse"))
      .collection<InventoryDocument>("shelf_inventory"),
  );
  const ordersData = new DatabaseOrders(
    client.db(mongoDatabaseName("orders")).collection<OrderDocument>("orders"),
  );
  await Promise.all([
    warehouseData.ensureIndexes(),
    ordersData.ensureIndexes(),
  ]);
  const warehouse = new WarehouseService(warehouseData, catalogue);
  const orders = new OrdersService(ordersData, warehouseData, catalogue);
  return { catalogue, warehouse, orders };
}

/** Each Koa application has independent services, keeping tests isolated. */
export function createApp(services: Services): Koa<AppState> {
  const app = new Koa<AppState>();
  qs(app);

  // tsoa generated routes throw ValidateError for invalid request payloads.
  // Our existing domain services throw HttpError with explicit HTTP statuses.
  app.use(async (ctx, next): Promise<void> => {
    try {
      await next();
    } catch (error) {
      // tsoa's generated Koa handler may rethrow a ValidateError through
      // Koa's context.throw(), which wraps it as an HTTP 422 error.
      // Preserve the validation fields while mapping client mistakes to 400.
      if (
        error instanceof ValidateError ||
        (typeof error === "object" &&
          error !== null &&
          "status" in error &&
          error.status === 422)
      ) {
        ctx.status = 400;
        const fields =
          typeof error === "object" && error !== null && "fields" in error
            ? error.fields
            : undefined;
        ctx.body = {
          error: "Invalid request.",
          ...(fields ? { details: fields } : {}),
        };
      } else if (error instanceof HttpError) {
        ctx.status = error.status;
        ctx.body = { error: error.message };
      } else if (
        typeof error === "object" &&
        error !== null &&
        "status" in error &&
        typeof error.status === "number" &&
        error.status >= 400 &&
        error.status < 500
      ) {
        ctx.status = error.status;
        ctx.body = { error: "Invalid request." };
      } else {
        console.error(error);
        ctx.status = 500;
        ctx.body = { error: "Internal server error." };
      }
    }
  });
  app.use(cors());
  app.use(bodyParser());
  app.use(async (ctx, next): Promise<void> => {
    ctx.state.services = services;
    await next();
  });

  app.use(
    koaSwagger({
      routePrefix: "/docs",
      specPrefix: "/docs/spec",
      exposeSpec: true,
      swaggerOptions: { spec: swagger },
    }),
  );

  const router = new Router();
  RegisterRoutes(router);
  app.use(router.routes());
  app.use(router.allowedMethods());
  return app;
}
