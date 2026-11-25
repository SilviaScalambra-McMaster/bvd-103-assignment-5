import {HttpError,nonemptyString,positiveInteger} from "../shared/errors";
import type {InventoryData,} from "./data";
import type {Collection} from "mongodb";
import type {BookCacheDocument} from "./database";
import type {Channel} from "amqplib";
import {publish} from "@mcmasterful/messaging";

export class WarehouseService {
  constructor(private readonly data:InventoryData, private readonly books:Collection<BookCacheDocument>, private readonly channel:Channel){}
  async placeBooksOnShelf(bookId:string,count:number,shelf:string){
    nonemptyString(bookId,"bookId"); nonemptyString(shelf,"shelf"); positiveInteger(count,"numberOfBooks");
    const book=await this.books.findOne({bookId}); if(!book) throw new HttpError(404,"Book not found.");
    await this.data.placeBookOnShelf(bookId,shelf,count);
    const total=Object.values(await this.data.getCopies(bookId)).reduce((a,b)=>a+b,0);
    await publish(this.channel,{type:"BookStockChanged",bookId,shelf,delta:count,stockTotal:total});
  }
  async getLocations(bookId:string){
    nonemptyString(bookId,"bookId");
    if(!(await this.books.findOne({bookId}))) throw new HttpError(404,"Book not found.");
    return Object.entries(await this.data.getCopies(bookId)).map(([shelf,count])=>({shelf,count})).sort((a,b)=>a.shelf.localeCompare(b.shelf));
  }
  async takeCopies(bookId:string,shelf:string,count:number){
    const ok=await this.data.takeCopies(bookId,shelf,count); if(!ok) return false;
    const total=Object.values(await this.data.getCopies(bookId)).reduce((a,b)=>a+b,0);
    await publish(this.channel,{type:"BookStockChanged",bookId,shelf,delta:-count,stockTotal:total});
    return true;
  }
  async handleFulfillment(orderId:string, selections:Array<{book:string;shelf:string;numberOfBooks:number}>){
    const totals=new Map<string,number>();
    for(const s of selections){if(!(await this.books.findOne({bookId:s.book}))) return {ok:false,reason:`Unknown book ${s.book}.`};}
    for(const s of selections) totals.set(`${s.book}|${s.shelf}`,(totals.get(`${s.book}|${s.shelf}`)??0)+s.numberOfBooks);
    for(const [key,count] of totals){const [book,shelf]=key.split("|"); if(await this.data.getCopiesOnShelf(book,shelf)<count) return {ok:false,reason:`Insufficient stock on shelf ${shelf} for ${book}.`};}
    const deducted:Array<{book:string;shelf:string;numberOfBooks:number}>=[];
    try{
      for(const [key,count] of totals){const [book,shelf]=key.split("|"); if(!(await this.takeCopies(book,shelf,count))) throw new Error(`Stock changed while fulfilling the order.`); deducted.push({book,shelf,numberOfBooks:count});}
      return {ok:true};
    }catch(error){
      for(const s of deducted){await this.data.placeBookOnShelf(s.book,s.shelf,s.numberOfBooks); const total=Object.values(await this.data.getCopies(s.book)).reduce((a,b)=>a+b,0); await publish(this.channel,{type:"BookStockChanged",bookId:s.book,shelf:s.shelf,delta:s.numberOfBooks,stockTotal:total});}
      return {ok:false,reason:error instanceof Error?error.message:"Fulfillment failed."};
    }
  }
}
