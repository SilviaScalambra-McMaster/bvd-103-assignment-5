export type OrderStatus="pending"|"fulfilled";
export interface OrderRecord{orderId:string;books:Record<string,number>;status:OrderStatus;createdAt:Date;}
export interface OrdersData{create(books:Record<string,number>):Promise<string>;findById(id:string):Promise<OrderRecord|null>;listPending():Promise<OrderRecord[]>;markFulfilled(id:string):Promise<boolean>;}
