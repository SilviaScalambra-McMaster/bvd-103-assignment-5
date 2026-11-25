export type BookID=string;
export interface Book {id?:BookID;name:string;author:string;description:string;price:number;image:string;stock?:number;}
export interface Filter {from?:number;to?:number;name?:string;author?:string;}
export type ShelfId=string;
export type OrderId=string;
