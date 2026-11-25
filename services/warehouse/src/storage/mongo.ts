import {MongoClient,type Collection} from "mongodb";
import type {InventoryDocument,BookCacheDocument} from "../warehouse/database";
let client:MongoClient|undefined;
export function getClient(){if(!client)client=new MongoClient(process.env.MONGO_URI??"mongodb://warehouse-mongo:27017");return client;}
export function inventoryCollection():Collection<InventoryDocument>{return getClient().db("warehouse").collection("inventory");}
export function booksCollection():Collection<BookCacheDocument>{return getClient().db("warehouse").collection("books_cache");}
export async function close(){if(client){await client.close();client=undefined;}}
