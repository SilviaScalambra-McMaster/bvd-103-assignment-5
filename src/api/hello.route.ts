import { Get, OperationId, Path, Route, Tags } from "tsoa";

/** Simple diagnostic route used to demonstrate generated-client calls. */
@Route("hello")
@Tags("Hello")
export class HelloController {
  /**
   * Return a friendly greeting for the given name.
   * @summary Greet a partner
   * @example name "Ada"
   */
  @Get("{name}")
  @OperationId("sayHello")
  public async sayHello(@Path() name: string): Promise<string> {
    return `Hello ${name}`;
  }
}
