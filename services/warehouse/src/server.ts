import {connectEventBus,subscribe,publish} from "@mcmasterful/messaging";import {createApp} from "./app";import {DatabaseInventory} from "./warehouse/database";import {WarehouseService} from "./warehouse/service";import {booksCollection,inventoryCollection,close} from "./storage/mongo";
async function main(){
 const {channel,connection}=await connectEventBus();
 const books=booksCollection(); const inventory=new DatabaseInventory(inventoryCollection()); await inventory.ensureIndexes();
 const catalogueUrl=process.env.CATALOGUE_URL;
 if(catalogueUrl){
   try{
     const response=await fetch(`${catalogueUrl}/books`);
     if(response.ok){const list=await response.json() as Array<{id:string;name:string;author:string;description:string;price:number;image:string;stock:number}>;
       for(const b of list) await books.updateOne({bookId:b.id},{$set:{bookId:b.id,name:b.name,author:b.author,description:b.description,price:b.price,image:b.image}},{upsert:true});
     }
   }catch(error){console.warn("Initial catalogue sync skipped:",error);}
 }
 const warehouse=new WarehouseService(inventory,books,channel);
 await subscribe(channel,"warehouse",["BookAdded","BookUpdated","BookDeleted","OrderFulfillmentRequested"],async event=>{
  if(event.type==="BookAdded"||event.type==="BookUpdated"){await books.updateOne({bookId:event.book.id},{$set:{bookId:event.book.id,...event.book}},{upsert:true});}
  else if(event.type==="BookDeleted"){await books.deleteOne({bookId:event.bookId});}
  else if(event.type==="OrderFulfillmentRequested"){
    const result=await warehouse.handleFulfillment(event.orderId,event.fulfillment);
    if(result.ok) await publish(channel,{type:"OrderFulfillmentCompleted",orderId:event.orderId,books:{}});
    else await publish(channel,{type:"OrderFulfillmentFailed",orderId:event.orderId,reason:result.reason ?? "Order fulfillment failed"});
  }
 });
 const port=Number(process.env.PORT??3000);const server=createApp({warehouse}).listen(port,()=>console.log(`Warehouse service on ${port}`));
 const shutdown=async()=>{server.close();await connection.close();await close();};process.once("SIGINT",()=>void shutdown());process.once("SIGTERM",()=>void shutdown());
}
main().catch(e=>{console.error(e);process.exitCode=1;});
