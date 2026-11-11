import { randomUUID } from "node:crypto";
import { MongoMemoryServer } from "mongodb-memory-server";
import { MongoClient } from "mongodb";

// Starts a real MongoDB binary with an in-memory storage location for test isolation.
// The binary is downloaded on first use and cached for later test runs.
export async function createTestDatabase() {
  const server = await MongoMemoryServer.create({
    binary: { version: "7.0.14" },
  });
  const client = new MongoClient(server.getUri());
  await client.connect();
  return {
    client,
    isolatedName: (domain: string) =>
      `test_${randomUUID().replace(/-/g, "")}_${domain}`,
    async stop(): Promise<void> {
      await client.close();
      await server.stop();
    },
  };
}
