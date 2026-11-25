export interface InventoryData {
  placeBookOnShelf(bookId:string,shelf:string,count:number):Promise<void>;
  getCopiesOnShelf(bookId:string,shelf:string):Promise<number>;
  getCopies(bookId:string):Promise<Record<string,number>>;
  takeCopies(bookId:string,shelf:string,count:number):Promise<boolean>;
}
