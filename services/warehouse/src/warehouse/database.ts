import {type Collection} from "mongodb";
import type {InventoryData} from "./data";
export interface InventoryDocument {bookId:string;shelf:string;count:number;}
export interface BookCacheDocument {bookId:string;name:string;author:string;description:string;price:number;image:string;}
export class DatabaseInventory implements InventoryData {
  constructor(private readonly inventory:Collection<InventoryDocument>){}
  async ensureIndexes(){await this.inventory.createIndex({bookId:1,shelf:1},{unique:true});}
  async placeBookOnShelf(bookId:string,shelf:string,count:number){await this.inventory.updateOne({bookId,shelf},{$inc:{count}},{upsert:true});}
  async getCopiesOnShelf(bookId:string,shelf:string){return (await this.inventory.findOne({bookId,shelf}))?.count??0;}
  async getCopies(bookId:string){const docs=await this.inventory.find({bookId,count:{$gt:0}}).toArray();return Object.fromEntries(docs.map(d=>[d.shelf,d.count]));}
  async takeCopies(bookId:string,shelf:string,count:number){const r=await this.inventory.updateOne({bookId,shelf,count:{$gte:count}},{$inc:{count:-count}});return r.modifiedCount===1;}
}
