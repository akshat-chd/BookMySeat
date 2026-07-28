import { randomUUID } from "node:crypto";
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import {
  LATEST_EVENT_KEY,
  orderParamsSchema,
  eventParamsSchema,
  reservationParamsSchema,
  reserveRequestSchema,
  authRequestSchema,
  sendOtpSchema,
  registerRequestSchema,
  reservationRoom,
  eventRoom,
  type HealthResponse,
  type OrderDetailsResponse,
  type EventResponse,
  type SeatResponse,
  type AuthResponse,
  type ReservationCreatedEvent,
  type ReservationDetailsResponse,
  type ReservationResponse
} from "@flashdrop/shared";
import { HttpError } from "./lib/http-error";
import { attachRequestId, requestLogger } from "./lib/request-context";
import { publishReservationCreated } from "./lib/kafka";
import { publishSocketEvent } from "./lib/socket-events";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  getMetrics,
  recordRecentEvent
} from "./services/metrics";
import {
  finalizeIdempotency,
  rollbackReservation,
  runReservationScript,
  waitForCompletedIdempotency
} from "./services/reservation-script";
import { publishDuplicateEvent, resetDemo } from "./services/demo";
import type { ApiContext } from "./types";

export function createApp(ctx: ApiContext) {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(requestLogger);
  app.use(attachRequestId);

  const rateLimiter = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!req.path.startsWith("/api/")) return next();
    
    // Ignore health and metrics endpoints for rate limiting
    if (req.path === "/api/health" || req.path === "/api/metrics") return next();

    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
    const key = `flashdrop:ratelimit:${ip}`;
    
    try {
      const current = await ctx.redis.incr(key);
      if (current === 1) {
        await ctx.redis.expire(key, 60); // 60 seconds window
      }
      
      if (current > 100) { // Limit to 100 requests per minute
        res.status(429).json({ error: "Too many requests, please try again later." });
        return;
      }
      next();
    } catch (err) {
      next(); // Fail open if Redis fails
    }
  };

  app.use(rateLimiter);

  app.get("/health", async (_req, res, next) => {
    try {
      const [redisStatus, postgresStatus] = await Promise.all([
        ctx.redis
          .ping()
          .then(() => "up" as const)
          .catch(() => "down" as const),
        ctx.prisma.$queryRawUnsafe("SELECT 1")
          .then(() => "up" as const)
          .catch(() => "down" as const)
      ]);

      const response: HealthResponse = {
        status:
          redisStatus === "up" && postgresStatus === "up" && ctx.kafkaConnected
            ? "up"
            : "down",
        instanceId: ctx.instanceId,
        services: {
          redis: redisStatus,
          postgres: postgresStatus,
          kafka: ctx.kafkaConnected ? "up" : "down"
        }
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  });

  const JWT_SECRET = process.env.JWT_SECRET || "super-secret-jwt-key";

  const authMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({ error: "Missing or invalid authorization header" });
      return;
    }
    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string, role?: string };
      (req as any).user = decoded;
      next();
    } catch (err) {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }
  };

  const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const user = (req as any).user;
    if (!user || user.role !== "ADMIN") {
      res.status(403).json({ error: "Forbidden: Admin access required" });
      return;
    }
    next();
  };

  app.post("/api/auth/send-otp", async (req, res, next) => {
    try {
      const { email } = sendOtpSchema.parse(req.body);
      const existingUser = await ctx.prisma.user.findUnique({ where: { email } });
      if (existingUser) throw new HttpError(409, "Email already in use");

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpKey = `flashdrop:otp:${email}`;

      // Store in Redis with 5 minutes (300 seconds) expiration
      await ctx.redis.setEx(otpKey, 300, otp);

      // Simulate sending email without returning OTP to client
      console.log(`\n[EMAIL SERVICE MOCK] 📧 Sending OTP to ${email}: ${otp}\n`);

      res.json({ message: "OTP sent successfully" });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/auth/register", async (req, res, next) => {
    try {
      const { email, password, name, otp } = registerRequestSchema.parse(req.body);
      const existingUser = await ctx.prisma.user.findUnique({ where: { email } });
      if (existingUser) throw new HttpError(409, "Email already in use");

      const otpKey = `flashdrop:otp:${email}`;
      const savedOtp = await ctx.redis.get(otpKey);

      if (!savedOtp || savedOtp !== otp) {
        throw new HttpError(400, "Invalid or expired verification code");
      }

      await ctx.redis.del(otpKey);

      const passwordHash = await bcrypt.hash(password, 10);
      const user = await ctx.prisma.user.create({
        data: {
          id: randomUUID(),
          email,
          passwordHash,
          name: name || email.split("@")[0]
        }
      });

      const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
      res.status(201).json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } } satisfies AuthResponse);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/users/:userId/orders", async (req, res, next) => {
    try {
      const { userId } = req.params;
      const orders = await ctx.prisma.order.findMany({
        where: { userId },
        include: {
          event: true,
          seats: true
        },
        orderBy: { createdAt: "desc" }
      });
      res.json(orders);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/auth/login", async (req, res, next) => {
    try {
      const { email, password } = authRequestSchema.parse(req.body);
      const user = await ctx.prisma.user.findUnique({ where: { email } });
      if (!user) throw new HttpError(401, "Invalid email or password");

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) throw new HttpError(401, "Invalid email or password");

      const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
      res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } } satisfies AuthResponse);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/events", async (_req, res, next) => {
    try {
      const cacheKey = "flashdrop:cache:events";
      const cached = await ctx.redis.get(cacheKey);
      if (cached) {
        res.json(JSON.parse(cached));
        return;
      }

      const events = await ctx.prisma.event.findMany({
        orderBy: { createdAt: "asc" }
      });

      await ctx.redis.setEx(cacheKey, 30, JSON.stringify(events));
      res.json(events);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/events/search", async (req, res, next) => {
    try {
      const q = req.query.q as string || "";
      if (!q) {
        res.json([]);
        return;
      }
      
      const events = await ctx.prisma.event.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { genre: { contains: q, mode: 'insensitive' } }
          ]
        },
        take: 5
      });
      res.json(events);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/events/:id", async (req, res, next) => {
    try {
      const { id } = eventParamsSchema.parse(req.params);
      const cacheKey = `flashdrop:cache:events:${id}`;
      const cached = await ctx.redis.get(cacheKey);
      if (cached) {
        res.json(JSON.parse(cached));
        return;
      }

      const event = await ctx.prisma.event.findUnique({
        where: { id }
      });

      if (!event) {
        throw new HttpError(404, "Event not found");
      }

      await ctx.redis.setEx(cacheKey, 30, JSON.stringify(event));
      res.json(event);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/events/:id/seats", async (req, res, next) => {
    try {
      const { id } = eventParamsSchema.parse(req.params);
      const seats = await ctx.prisma.seat.findMany({
        where: { eventId: id },
        orderBy: [{ row: 'asc' }, { number: 'asc' }]
      });

      const response: SeatResponse[] = seats.map(s => ({
        id: s.id,
        eventId: s.eventId,
        row: s.row,
        number: s.number,
        status: s.status
      }));

      res.json(response);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/events/:id/seats/reserve", async (req, res, next) => {
    try {
      const { id } = eventParamsSchema.parse(req.params);
      const body = reserveRequestSchema.parse(req.body);
      const reservationId = randomUUID();
      const expiresAt = new Date(
        Date.now() + ctx.env.RESERVATION_TTL_SECONDS * 1000
      ).toISOString();

      const event = await ctx.prisma.event.findUnique({
        where: { id }
      });

      if (!event) {
        throw new HttpError(404, "Event not found");
      }

      // Verify all seats exist and belong to this event
      const seats = await ctx.prisma.seat.findMany({
        where: {
          id: { in: body.seatIds }
        }
      });

      if (seats.length !== body.seatIds.length || seats.some(s => s.eventId !== id)) {
        throw new HttpError(404, "One or more seats not found for this event");
      }

      const reserveResult = await runReservationScript(ctx.redis, {
        eventId: id,
        seatIds: body.seatIds,
        idempotencyToken: body.idempotencyKey,
        reservationId,
        userId: body.userId,
        ttlSeconds: ctx.env.RESERVATION_TTL_SECONDS,
        expiresAt
      });

      if (reserveResult.code === "SOLD_OUT") {
        const soldOutResponse: ReservationResponse = { status: "SOLD_OUT" };
        res.status(409).json(soldOutResponse);
        return;
      }

      if (reserveResult.code === "REPLAY") {
        res.json({
          status: "RESERVED",
          reservationId: reserveResult.reservationId,
          expiresAt: reserveResult.expiresAt,
          replay: true
        } satisfies ReservationResponse);
        return;
      }

      if (reserveResult.code === "IN_PROGRESS") {
        const completed = await waitForCompletedIdempotency(ctx.redis, body.idempotencyKey);
        if (completed?.status === "RESERVED") {
          res.json({
            status: "RESERVED",
            reservationId: completed.reservationId,
            expiresAt: completed.expiresAt,
            replay: true
          } satisfies ReservationResponse);
          return;
        }

        if (completed?.status === "SOLD_OUT") {
          res.status(409).json({ status: "SOLD_OUT" } satisfies ReservationResponse);
          return;
        }

        res.status(202).json({
          status: "RESERVED",
          reservationId: reserveResult.reservationId,
          expiresAt: reserveResult.expiresAt,
          replay: true
        } satisfies ReservationResponse);
        return;
      }

      let persistedReservation = false;

      try {
        // Guarantee User record exists in Postgres DB to prevent foreign key constraint violations
        await ctx.prisma.user.upsert({
          where: { id: body.userId },
          update: {},
          create: {
            id: body.userId,
            email: `user-${body.userId.slice(0, 8)}@bookmyseat.demo`,
            passwordHash: "$2a$10$wN3910839e0130948e02830e",
            name: "Guest User"
          }
        });

        await ctx.prisma.reservation.create({
          data: {
            id: reserveResult.reservationId!,
            eventId: id,
            userId: body.userId,
            status: "ACTIVE",
            expiresAt: new Date(reserveResult.expiresAt!),
            seats: {
              connect: body.seatIds.map((sid) => ({ id: sid }))
            }
          }
        });
        persistedReservation = true;
        
        // Optimistically update all seat statuses in Postgres
        await ctx.prisma.seat.updateMany({
          where: { id: { in: body.seatIds } },
          data: { status: "LOCKED" }
        });

        const eventPayload: ReservationCreatedEvent = {
          eventId: randomUUID(),
          eventType: "RESERVATION_CREATED",
          reservationId: reserveResult.reservationId!,
          userId: body.userId,
          concertEventId: id,
          seatIds: body.seatIds,
          timestamp: new Date().toISOString()
        };

        await publishReservationCreated(
          ctx.kafkaProducer,
          ctx.env.KAFKA_TOPIC_RESERVATION_CREATED,
          eventPayload
        );

        await finalizeIdempotency(
          ctx.redis,
          body.idempotencyKey,
          {
            status: "RESERVED",
            reservationId: reserveResult.reservationId,
            expiresAt: reserveResult.expiresAt
          },
          ctx.env.RESERVATION_TTL_SECONDS
        );

        await ctx.redis.set(LATEST_EVENT_KEY, JSON.stringify(eventPayload), {
          EX: ctx.env.RESERVATION_TTL_SECONDS
        });

        await recordRecentEvent(ctx.redis, {
          id: randomUUID(),
          kind: "reservation",
          label: `Seats ${seats.map(s => s.row + s.number).join(", ")} locked by ${ctx.instanceId}`,
          timestamp: new Date().toISOString()
        });

        // Notify specific reservation listener
        await publishSocketEvent(ctx.redis, ctx.env.SOCKET_REDIS_CHANNEL, {
          room: reservationRoom(reserveResult.reservationId!),
          event: "reservation:created",
          payload: {
            reservationId: reserveResult.reservationId!,
            expiresAt: reserveResult.expiresAt!,
            eventId: id,
            seatIds: body.seatIds
          }
        });
        
        // Notify all clients viewing the seat map
        await publishSocketEvent(ctx.redis, ctx.env.SOCKET_REDIS_CHANNEL, {
          room: eventRoom(id),
          event: "seat:locked",
          payload: {
            eventId: id,
            seatIds: body.seatIds,
            expiresAt: reserveResult.expiresAt!
          }
        });
      } catch (error) {
        if (persistedReservation) {
          await ctx.prisma.reservation.deleteMany({
            where: {
              id: reserveResult.reservationId!
            }
          });
          // Rollback seat status if we got that far
          await ctx.prisma.seat.updateMany({
             where: { id: { in: body.seatIds } },
             data: { status: "AVAILABLE" }
          });
        }

        await rollbackReservation(ctx.redis, {
          seatIds: body.seatIds,
          idempotencyToken: body.idempotencyKey,
          reservationId: reserveResult.reservationId!
        });

        throw error;
      }

      res.status(201).json({
        status: "RESERVED",
        reservationId: reserveResult.reservationId,
        expiresAt: reserveResult.expiresAt
      } satisfies ReservationResponse);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/reservations/:id", async (req, res, next) => {
    try {
      const { id } = reservationParamsSchema.parse(req.params);
      const reservation = await ctx.prisma.reservation.findUnique({
        where: { id },
        include: { seats: true }
      });

      if (!reservation) {
        throw new HttpError(404, "Reservation not found");
      }

      const response: ReservationDetailsResponse = {
        id: reservation.id,
        eventId: reservation.eventId,
        seatIds: reservation.seats.map(s => s.id),
        userId: reservation.userId,
        status: reservation.status,
        expiresAt: reservation.expiresAt.toISOString(),
        createdAt: reservation.createdAt.toISOString()
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/orders/:id", async (req, res, next) => {
    try {
      const { id } = orderParamsSchema.parse(req.params);
      const order = await ctx.prisma.order.findUnique({
        where: { id },
        include: { seats: true }
      });

      if (!order) {
        throw new HttpError(404, "Order not found");
      }

      const response: OrderDetailsResponse = {
        id: order.id,
        reservationId: order.reservationId,
        userId: order.userId,
        eventId: order.eventId,
        seatIds: order.seats.map(s => s.id),
        status: order.status,
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString()
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/metrics", async (_req, res, next) => {
    try {
      const metrics = await getMetrics(ctx.redis, ctx.prisma, ctx.env.DEMO_EVENT_ID);
      res.json(metrics);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/admin/reset-demo", authMiddleware, requireAdmin, async (_req, res, next) => {
    try {
      await resetDemo(ctx);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/admin/publish-duplicate-event", authMiddleware, requireAdmin, async (_req, res, next) => {
    try {
      await publishDuplicateEvent(ctx);
      res.status(202).json({ status: "queued" });
    } catch (error) {
      next(error);
    }
  });

  app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof HttpError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }

    if ("issues" in error) {
      res.status(400).json({ error: "Invalid request", details: (error as any).issues });
      return;
    }

    res.status(500).json({ error: error.message || "Internal Server Error" });
  });

  return app;
}
