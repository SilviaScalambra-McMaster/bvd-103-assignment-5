export interface BookInput {
  /** @minLength 1 */
  name: string;
  /** @minLength 1 */
  author: string;
  description: string;
  /** @minimum 0 */
  price: number;
  image: string;
}
export interface BookResponse extends BookInput { id: string; stock: number; }
export interface BookFilterInput { from?: number; to?: number; name?: string; author?: string; }
export interface SearchBooksRequest { filters: BookFilterInput[]; }
export interface ErrorResponse { error: string; details?: Record<string,{message:string}>; }
