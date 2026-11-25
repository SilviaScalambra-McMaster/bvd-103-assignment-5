import { createApp } from "./app";
import { ObjectId } from "mongodb";
import { MongoBookCatalogue } from "./books/catalogue";
import { getBooksCollection, getMongoClient, closeMongoClient } from "./storage/mongo";
import { connectEventBus, publish, subscribe } from "@mcmasterful/messaging";

async function main() {
  const {channel,connection}=await connectEventBus();
  const catalogue=new MongoBookCatalogue(await getBooksCollection());
  await subscribe(channel,"catalogue",["BookStockChanged"],async(event)=>{
    if(event.type!=="BookStockChanged") return;
    await getMongoClient().db("catalogue").collection("books").updateOne({_id:new ObjectId(event.bookId)},{$set:{stockTotal:event.stockTotal}});
  });
  const services={catalogue,channel,publish:(event:any)=>publish(channel,event)};
  const port=Number(process.env.PORT??3000);
  const server=createApp(services).listen(port,()=>console.log(`Catalogue service on ${port}`));
  const shutdown=async()=>{server.close();await connection.close();await closeMongoClient();};
  process.once("SIGINT",()=>void shutdown()); process.once("SIGTERM",()=>void shutdown());
}
main().catch((e)=>{console.error(e);process.exitCode=1;});
