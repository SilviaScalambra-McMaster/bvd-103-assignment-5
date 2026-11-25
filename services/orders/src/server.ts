import {connectEventBus,subscribe} from "@mcmasterful/messaging";import {createApp} from "./app";import {DatabaseOrders} from "./orders/database";import {OrdersService} from "./orders/service";import {ordersCollection,validBooksCollection,close} from "./storage/mongo";
async function main(){
 const {channel,connection}=await connectEventBus();const ordersData=new DatabaseOrders(ordersCollection());await ordersData.ensureIndexes();const validBooks=validBooksCollection();
 const catalogueUrl=process.env.CATALOGUE_URL;
 if(catalogueUrl){
   try{
     const response=await fetch(`${catalogueUrl}/books`);
     if(response.ok){const list=await response.json() as Array<{id:string}>;
       for(const b of list) await validBooks.updateOne({bookId:b.id},{$set:{bookId:b.id}},{upsert:true});
     }
   }catch(error){console.warn("Initial catalogue sync skipped:",error);}
 }const orders=new OrdersService(ordersData,validBooks,channel);
 await subscribe(channel,"orders",["BookAdded","BookUpdated","BookDeleted","OrderFulfillmentCompleted","OrderFulfillmentFailed"],async event=>{
  if(event.type==="BookAdded"||event.type==="BookUpdated")await validBooks.updateOne({bookId:event.book.id},{$set:{bookId:event.book.id}},{upsert:true});
  else if(event.type==="BookDeleted")await validBooks.deleteOne({bookId:event.bookId});
  else if(event.type==="OrderFulfillmentCompleted")orders.resolveFulfillment(event.orderId,true);
  else if(event.type==="OrderFulfillmentFailed")orders.resolveFulfillment(event.orderId,false,event.reason);
 });
 const port=Number(process.env.PORT??3000);const server=createApp({orders}).listen(port,()=>console.log(`Orders service on ${port}`));
 const shutdown=async()=>{server.close();await connection.close();await close();};process.once("SIGINT",()=>void shutdown());process.once("SIGTERM",()=>void shutdown());
}
main().catch(e=>{console.error(e);process.exitCode=1;});
