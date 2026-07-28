import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { prisma } from "@flashdrop/database";
import {
  LATEST_EVENT_KEY,
  metricsKeys,
  parseEnv,
  reservationRoom,
  eventRoom,
  SOCKET_EVENTS_CHANNEL,
  type ReservationCreatedEvent,
  sendOrderConfirmation
} from "@flashdrop/shared";
import { Kafka } from "kafkajs";
import { createClient } from "redis";

type TransactionClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

async function bootstrap() {
  const env = parseEnv(process.env);
  const redis = createClient({ url: env.REDIS_URL });
  await redis.connect();

  const kafka = new Kafka({
    clientId: `${env.KAFKA_CLIENT_ID}-worker`,
    brokers: env.KAFKA_BROKERS.split(",").map((broker) => broker.trim())
  });

  const consumer = kafka.consumer({
    groupId: env.KAFKA_GROUP_ID
  });

  await consumer.connect();
  await consumer.subscribe({
    topic: env.KAFKA_TOPIC_RESERVATION_CREATED,
    fromBeginning: true
  });

  await consumer.run({
    eachMessage: async ({ message }) => {
      if (!message.value) {
        return;
      }

      let event: ReservationCreatedEvent;
      try {
        event = JSON.parse(message.value.toString()) as ReservationCreatedEvent;
      } catch (error) {
        console.error("Malformed Kafka message", error);
        return;
      }

      const alreadyProcessed = await prisma.processedEvent.findUnique({
        where: { eventId: event.eventId }
      });

      if (alreadyProcessed) {
        await redis.incr(metricsKeys.duplicateEventsPrevented);
        await recordRecentEvent(redis, {
          id: randomUUID(),
          kind: "system",
          label: `Duplicate Kafka event blocked: ${event.eventId}`,
          timestamp: new Date().toISOString()
        });
        return;
      }

      const orderId = randomUUID();
      const concertEventId = event.concertEventId;
      const seatIds = event.seatIds;

      await prisma.$transaction(async (tx: TransactionClient) => {
        await tx.processedEvent.create({
          data: {
            eventId: event.eventId,
            eventType: event.eventType
          }
        });

        await tx.order.create({
          data: {
            id: orderId,
            reservationId: event.reservationId,
            userId: event.userId,
            eventId: concertEventId,
            status: "PENDING",
            seats: {
              connect: seatIds.map((id) => ({ id }))
            }
          }
        });
      });

      await redis.incr(metricsKeys.ordersCreated);
      await publishSocket(redis, env.SOCKET_REDIS_CHANNEL || SOCKET_EVENTS_CHANNEL, {
        room: reservationRoom(event.reservationId),
        event: "order:processing",
        payload: {
          reservationId: event.reservationId,
          orderId,
          status: "PENDING",
          updatedAt: new Date().toISOString()
        }
      });

      await recordRecentEvent(redis, {
        id: randomUUID(),
        kind: "order",
        label: `Order ${orderId} entered processing`,
        timestamp: new Date().toISOString()
      });

      await delay(800);

      const updatedOrder = await prisma.$transaction(async (tx: TransactionClient) => {
        const order = await tx.order.update({
          where: { id: orderId },
          data: {
            status: "CONFIRMED"
          }
        });

        await tx.reservation.update({
          where: { id: event.reservationId },
          data: {
            status: "CONVERTED"
          }
        });

        await tx.seat.updateMany({
          where: { id: { in: seatIds } },
          data: {
            status: "SOLD"
          }
        });

        return order;
      });

      await publishSocket(redis, env.SOCKET_REDIS_CHANNEL || SOCKET_EVENTS_CHANNEL, {
        room: reservationRoom(event.reservationId),
        event: "order:confirmed",
        payload: {
          reservationId: event.reservationId,
          orderId,
          status: "CONFIRMED",
          updatedAt: updatedOrder.updatedAt.toISOString()
        }
      });

      // Send actual ticket email using Nodemailer
      const eventName = await prisma.event.findUnique({ where: { id: concertEventId } }).then(e => e?.name || "FlashDrop Event");
      await sendOrderConfirmation(event.userId, {
        orderId,
        eventName,
        seats: seatIds
      });
      
      await publishSocket(redis, env.SOCKET_REDIS_CHANNEL || SOCKET_EVENTS_CHANNEL, {
        room: eventRoom(concertEventId),
        event: "seat:sold",
        payload: {
          eventId: concertEventId,
          seatIds: seatIds
        }
      });

      await recordRecentEvent(redis, {
        id: randomUUID(),
        kind: "order",
        label: `Order ${orderId} confirmed (Seats Sold)`,
        timestamp: new Date().toISOString()
      });

      await redis.set(LATEST_EVENT_KEY, JSON.stringify(event), {
        EX: env.RESERVATION_TTL_SECONDS
      });
    }
  });

  const shutdown = async () => {
    await Promise.allSettled([
      consumer.disconnect(),
      redis.quit(),
      prisma.$disconnect()
    ]);
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

async function publishSocket(
  redis: ReturnType<typeof createClient>,
  channel: string,
  payload: Record<string, unknown>
) {
  await redis.publish(channel, JSON.stringify(payload));
}

async function recordRecentEvent(
  redis: ReturnType<typeof createClient>,
  event: { id: string; kind: "reservation" | "order" | "system"; label: string; timestamp: string }
) {
  await redis.lPush("flashdrop:recent-events", JSON.stringify(event));
  await redis.lTrim("flashdrop:recent-events", 0, 11);
}

bootstrap().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
