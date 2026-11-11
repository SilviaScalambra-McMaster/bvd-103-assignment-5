import { createApp, createMongoServices } from "./app";
import { closeMongoClient } from "./storage/mongo";

async function main(): Promise<void> {
  const services = await createMongoServices();
  const port = Number(process.env.PORT ?? 3000);
  const server = createApp(services).listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
  async function shutdown(): Promise<void> {
    server.close();
    await closeMongoClient();
  }
  process.once("SIGINT", () => {
    void shutdown();
  });
  process.once("SIGTERM", () => {
    void shutdown();
  });
}

main().catch((error: unknown) => {
  console.error("Unable to start the server:", error);
  process.exitCode = 1;
});
