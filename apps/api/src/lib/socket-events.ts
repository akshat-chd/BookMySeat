import type { SocketEnvelope } from "@flashdrop/shared";
import type { FlashdropRedis } from "./redis";

export async function publishSocketEvent(
  redis: FlashdropRedis,
  channel: string,
  envelope: SocketEnvelope
) {
  await redis.publish(channel, JSON.stringify(envelope));
}
