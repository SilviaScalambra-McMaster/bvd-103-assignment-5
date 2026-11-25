import {MongoClient,type Collection} from "mongodb";import type {OrderDocument} from "../orders/database";
let client:MongoClient|undefined;
export function getClient(){if(!client)client=new MongoClient(process.env.MONGO_URI??"mongodb://orders-mongo:27017");return client;}
export function ordersCollection():Collection<OrderDocument>{return getClient().db("orders").collection("orders");}
export function validBooksCollection():Collection<{bookId:string}>{return getClient().db("orders").collection("valid_books");}
export async function close(){if(client){await client.close();client=undefined;}}
