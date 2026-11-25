export interface PlaceOrderRequest {/** @minItems 1 */books:string[];}
export interface PlaceOrderResponse {orderId:string;}
export interface PendingOrder {orderId:string;books:{[key:string]:number};}
export interface FulfillmentItem {book:string;/** @minLength 1 */shelf:string;/** @isInt @minimum 1 */numberOfBooks:number;}
export interface FulfillmentRequest {/** @minItems 1 */fulfillment:FulfillmentItem[];}
export interface ErrorResponse {error:string;}
