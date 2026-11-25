import Koa from "koa";
import cors from "@koa/cors";
import bodyParser from "koa-bodyparser";
import qs from "koa-qs";
import Router from "@koa/router";
import { ValidateError } from "tsoa";
import { RegisterRoutes } from "../build/routes";
import type { BookCatalogue } from "./books/catalogue";
import { HttpError } from "./shared/errors";
import type { Channel } from "amqplib";
import { publish } from "@mcmasterful/messaging";

export interface Services { catalogue: BookCatalogue; channel: Channel; publish: (event: Parameters<typeof publish>[1]) => Promise<void>; }
export function createApp(services: Services): Koa {
  const app=new Koa(); qs(app);
  app.use(async(ctx,next)=>{try{await next();}catch(error){
    if(error instanceof ValidateError || (typeof error==="object"&&error!==null&&"status" in error&&(error as {status?:unknown}).status===422)){ctx.status=400;ctx.body={error:"Invalid request."};}
    else if(error instanceof HttpError){ctx.status=error.status;ctx.body={error:error.message};}
    else {console.error(error);ctx.status=500;ctx.body={error:"Internal server error."};}
  }});
  app.use(cors()); app.use(bodyParser());
  app.use(async(ctx,next)=>{ctx.state.services=services;await next();});
  const router=new Router(); RegisterRoutes(router); app.use(router.routes()); app.use(router.allowedMethods());
  return app;
}
