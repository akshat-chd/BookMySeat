import { createServer } from "node:http";
import { prisma } from "@flashdrop/database";
import { createApp } from "./app";
import { loadEnv } from "./lib/env";
import { createKafkaProducer } from "./lib/kafka";
import { createRedisClient } from "./lib/redis";
import { resetDemo } from "./services/demo";

async function bootstrap() {
  const env = loadEnv();
  const redis = await createRedisClient(env);
  const kafkaProducer = createKafkaProducer(env);
  let kafkaConnected = false;

  await kafkaProducer.connect();
  kafkaConnected = true;

  const instanceId =
    process.env.INSTANCE_ID ??
    `api-${Math.random().toString(36).slice(2, 8)}`;

  const app = createApp({
    env,
    redis,
    kafkaProducer,
    kafkaConnected,
    prisma,
    instanceId
  });

  const existingEvent = await prisma.event.findUnique({
    where: { id: env.DEMO_EVENT_ID }
  });

  if (!existingEvent) {
    await resetDemo({
      env,
      redis,
      kafkaProducer,
      kafkaConnected,
      prisma,
      instanceId
    });
  }

  const server = createServer(app);

  server.listen(env.API_PORT, () => {
    console.log(`FlashDrop API ${instanceId} listening on port ${env.API_PORT}`);
  });

  const shutdown = async () => {
    await Promise.allSettled([
      new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve()))
      ),
      kafkaProducer.disconnect(),
      redis.quit(),
      prisma.$disconnect()
    ]);
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

bootstrap().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
