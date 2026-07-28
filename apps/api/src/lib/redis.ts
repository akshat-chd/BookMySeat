import { createClient } from "redis";
import type { ApiEnv } from "../types";

export type FlashdropRedis = ReturnType<typeof createClient>;

export async function createRedisClient(env: ApiEnv): Promise<FlashdropRedis> {
  const client = createClient({
    url: env.REDIS_URL
  });

  client.on("error", (error) => {
    console.error("Redis client error", error);
  });

  await client.connect();
  return client;
}
