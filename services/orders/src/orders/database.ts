import {randomUUID} from "node:crypto";import {type Collection} from "mongodb";import type {OrderRecord,OrdersData} from "./data";
export interface OrderDocument extends Omit<OrderRecord,"orderId">{_id:string;}
export class DatabaseOrders implements OrdersData{
 constructor(private readonly orders:Collection<OrderDocument>){}
 async ensureIndexes(){await this.orders.createIndex({status:1,createdAt:1});}
 async create(books:Record<string,number>){const id=randomUUID();await this.orders.insertOne({_id:id,books:{...books},status:"pending",createdAt:new Date()});return id;}
 async findById(id:string){const o=await this.orders.findOne({_id:id});return o?{orderId:o._id,books:{...o.books},status:o.status,createdAt:o.createdAt}:null;}
 async listPending(){const xs=await this.orders.find({status:"pending"}).sort({createdAt:1,_id:1}).toArray();return xs.map(o=>({orderId:o._id,books:{...o.books},status:o.status,createdAt:o.createdAt}));}
 async markFulfilled(id:string){const r=await this.orders.updateOne({_id:id,status:"pending"},{$set:{status:"fulfilled"}});return r.modifiedCount===1;}
}
