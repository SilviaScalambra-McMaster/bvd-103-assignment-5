export interface ShelfPlacement {bookId:string;/** @isInt @minimum 1 */numberOfBooks:number;/** @minLength 1 */shelf:string;}
export interface ShelfLocation {shelf:string;count:number;}
export interface ErrorResponse {error:string;}
