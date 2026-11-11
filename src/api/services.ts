import type Koa from "koa";
import type { Services } from "../app";

/** The services are attached to each request's Koa state, never stored globally. */
export function servicesFrom(request: Koa.Request): Services {
  const services: Services | undefined = request.ctx.state.services as
    Services | undefined;
  if (!services) throw new Error("Application services were not initialized.");
  return services;
}
