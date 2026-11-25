import type Koa from "koa";
import type { Services } from "../app";
export function servicesFrom(request: Koa.Request): Services {
  const services = request.ctx.state.services as Services | undefined;
  if (!services) throw new Error("Catalogue services were not initialized.");
  return services;
}
