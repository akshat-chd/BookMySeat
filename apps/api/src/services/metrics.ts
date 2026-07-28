import { RECENT_EVENTS_LIST_KEY, metricsKeys, type MetricsResponse, type RecentEvent } from "@flashdrop/shared";
import type { FlashdropRedis } from "../lib/redis";
import type { PrismaClient } from "@flashdrop/database";

const RECENT_EVENT_LIMIT = 12;

export async function resetMetrics(redis: FlashdropRedis) {
  await redis.mSet({
    [metricsKeys.reservationAttempts]: "0",
    [metricsKeys.successfulReservations]: "0",
    [metricsKeys.soldOutResponses]: "0",
    [metricsKeys.duplicateRequestsPrevented]: "0",
    [metricsKeys.ordersCreated]: "0",
    [metricsKeys.duplicateEventsPrevented]: "0"
  });
  await redis.del(RECENT_EVENTS_LIST_KEY);
}

export async function recordRecentEvent(redis: FlashdropRedis, event: RecentEvent) {
  await redis.lPush(RECENT_EVENTS_LIST_KEY, JSON.stringify(event));
  await redis.lTrim(RECENT_EVENTS_LIST_KEY, 0, RECENT_EVENT_LIMIT - 1);
}

export async function getRecentEvents(redis: FlashdropRedis): Promise<RecentEvent[]> {
  const payloads = await redis.lRange(RECENT_EVENTS_LIST_KEY, 0, RECENT_EVENT_LIMIT - 1);
  return payloads
    .map((value) => {
      try {
        return JSON.parse(value) as RecentEvent;
      } catch {
        return null;
      }
    })
    .filter((event): event is RecentEvent => Boolean(event));
}

export async function adjustSuccessfulReservations(redis: FlashdropRedis, delta: number) {
  if (delta === 0) {
    return;
  }

  await redis.incrBy(metricsKeys.successfulReservations, delta);
}

export async function incrementMetric(redis: FlashdropRedis, key: string) {
  await redis.incr(key);
}

export async function getMetrics(
  redis: FlashdropRedis,
  prisma: PrismaClient,
  eventId: string
): Promise<MetricsResponse> {
  const values = await redis.mGet([
    metricsKeys.reservationAttempts,
    metricsKeys.successfulReservations,
    metricsKeys.soldOutResponses,
    metricsKeys.duplicateRequestsPrevented,
    metricsKeys.ordersCreated,
    metricsKeys.duplicateEventsPrevented
  ]);

  const [
    reservationAttempts,
    successfulReservations,
    soldOutResponses,
    duplicateRequestsPrevented,
    ordersCreated,
    duplicateEventsPrevented
  ] = values.map((value) => Number(value ?? 0));

  // Get seat counts
  const totalSeats = await prisma.seat.count({ where: { eventId } });
  const availableSeats = await prisma.seat.count({ where: { eventId, status: "AVAILABLE" } });
  const lockedSeats = await prisma.seat.count({ where: { eventId, status: "LOCKED" } });
  const soldSeats = await prisma.seat.count({ where: { eventId, status: "SOLD" } });

  return {
    totalSeats,
    availableSeats,
    lockedSeats,
    soldSeats,
    reservationAttempts,
    successfulReservations,
    soldOutResponses,
    duplicateRequestsPrevented,
    ordersCreated,
    duplicateEventsPrevented,
    recentEvents: await getRecentEvents(redis)
  };
}
