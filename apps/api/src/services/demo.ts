import { randomUUID } from "node:crypto";
import { LATEST_EVENT_KEY, type ReservationCreatedEvent } from "@flashdrop/shared";
import type { ApiContext } from "../types";
import { resetMetrics, recordRecentEvent } from "./metrics";
import { publishReservationCreated } from "../lib/kafka";
import type { FlashdropRedis } from "../lib/redis";

export async function resetDemo(ctx: ApiContext) {
  const { prisma, redis, env } = ctx;

  await prisma.$transaction([
    prisma.order.deleteMany(),
    prisma.processedEvent.deleteMany(),
    prisma.reservation.deleteMany(),
    prisma.seat.deleteMany(),
    prisma.event.deleteMany()
  ]);

  const movies = [
    {
      id: env.DEMO_EVENT_ID,
      name: "Eras Tour - Los Angeles",
      description: "High concurrency concert ticketing demonstration. Try to secure front row seats before they sell out.",
      price: 49900,
      genre: "Concert",
      duration: 180,
      posterUrl: "https://images.unsplash.com/photo-1540039155733-d7696d4eb567?auto=format&fit=crop&w=800&q=80",
      bannerUrl: "https://images.unsplash.com/photo-1470229722913-7c090be5c520?auto=format&fit=crop&w=1600&q=80"
    },
    {
      id: "inception-imax",
      name: "Inception IMAX Re-release",
      description: "Experience the mind-bending thriller on the biggest screen possible.",
      price: 2500,
      genre: "Sci-Fi Thriller",
      duration: 148,
      posterUrl: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=800&q=80",
      bannerUrl: "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&w=1600&q=80"
    },
    {
      id: "phantom-opera",
      name: "The Phantom of the Opera",
      description: "The classic musical returns to Broadway for a limited engagement.",
      price: 15000,
      genre: "Musical",
      duration: 150,
      posterUrl: "https://images.unsplash.com/photo-1507676184212-d0330a151f84?auto=format&fit=crop&w=800&q=80",
      bannerUrl: "https://images.unsplash.com/photo-1516307365426-bea591f05011?auto=format&fit=crop&w=1600&q=80"
    },
    {
      id: "lakers-warriors",
      name: "Lakers vs Warriors - Game 7",
      description: "Western Conference Finals Game 7. Win or go home.",
      price: 89900,
      genre: "Sports",
      duration: 150,
      posterUrl: "https://images.unsplash.com/photo-1504450758481-7338eba7524a?auto=format&fit=crop&w=800&q=80",
      bannerUrl: "https://images.unsplash.com/photo-1518063319789-7217e6706b04?auto=format&fit=crop&w=1600&q=80"
    }
  ];

  await prisma.event.createMany({ data: movies });

  // Seed 100 seats: 10 rows (A-J), 10 seats per row for EACH movie
  const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
  const seatData = [];
  
  for (const movie of movies) {
    for (const row of rows) {
      for (let i = 1; i <= 10; i++) {
        seatData.push({
          id: randomUUID(),
          eventId: movie.id,
          row,
          number: i,
          status: "AVAILABLE" as const
        });
      }
    }
  }

  await prisma.seat.createMany({
    data: seatData
  });

  await clearFlashdropKeys(redis);
  await resetMetrics(redis);

  await recordRecentEvent(redis, {
    id: randomUUID(),
    kind: "system",
    label: `Demo reset with 4 events and 400 available seats`,
    timestamp: new Date().toISOString()
  });
}

async function clearFlashdropKeys(redis: FlashdropRedis) {
  for await (const key of redis.scanIterator({
    MATCH: "flashdrop:*",
    COUNT: 100
  })) {
    await redis.del(key);
  }
}

export async function publishDuplicateEvent(ctx: ApiContext) {
  const raw = await ctx.redis.get(LATEST_EVENT_KEY);
  if (!raw) {
    throw new Error("No reservation event available yet");
  }

  const event = JSON.parse(raw) as ReservationCreatedEvent;

  await Promise.all([
    publishReservationCreated(ctx.kafkaProducer, ctx.env.KAFKA_TOPIC_RESERVATION_CREATED, event),
    publishReservationCreated(ctx.kafkaProducer, ctx.env.KAFKA_TOPIC_RESERVATION_CREATED, event),
    publishReservationCreated(ctx.kafkaProducer, ctx.env.KAFKA_TOPIC_RESERVATION_CREATED, event)
  ]);

  await recordRecentEvent(ctx.redis, {
    id: randomUUID(),
    kind: "system",
    label: `Republished duplicate event ${event.eventId}`,
    timestamp: new Date().toISOString()
  });
}
