import type Koa from "koa"; import type {Services} from "../app";
export function servicesFrom(request:Koa.Request):Services{const s=request.ctx.state.services as Services|undefined;if(!s)throw new Error("Warehouse services unavailable.");return s;}
