import { z } from "zod";
import dotenv from "dotenv";
import path from "path";

if (typeof window === "undefined") {
  dotenv.config();
  [
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), "../.env"),
    path.resolve(process.cwd(), "../../.env"),
    "/home/ubuntu/bookmyseat/.env"
  ].forEach((envPath) => {
    try {
      dotenv.config({ path: envPath });
    } catch (e) {}
  });
}

export const DEMO_EVENT_ID = "demo-event";
export const DEFAULT_RESERVATION_TTL_SECONDS = 120; // 2 minutes to checkout
export const RESERVATION_TOPIC = "reservation.created";
export const SOCKET_EVENTS_CHANNEL = "flashdrop:socket-events";
export const RECENT_EVENTS_LIST_KEY = "flashdrop:recent-events";
export const LATEST_EVENT_KEY = "flashdrop:latest-kafka-event";

export const metricsKeys = {
  reservationAttempts: "flashdrop:metrics:reservation-attempts",
  successfulReservations: "flashdrop:metrics:successful-reservations",
  soldOutResponses: "flashdrop:metrics:sold-out-responses",
  duplicateRequestsPrevented: "flashdrop:metrics:duplicate-requests-prevented",
  ordersCreated: "flashdrop:metrics:orders-created",
  duplicateEventsPrevented: "flashdrop:metrics:duplicate-events-prevented"
} as const;

export type SaleUiStatus =
  | "READY"
  | "RESERVING"
  | "RESERVED"
  | "PROCESSING"
  | "CONFIRMED"
  | "SOLD_OUT"
  | "ERROR";

export type ReservationStatus = "ACTIVE" | "CONVERTED" | "EXPIRED";
export type OrderStatus = "PENDING" | "CONFIRMED" | "FAILED";
export type SeatStatus = "AVAILABLE" | "LOCKED" | "SOLD";

export type HealthStatus = "up" | "down";

export interface EventResponse {
  id: string;
  name: string;
  description: string;
  price: number;
}

export interface SeatResponse {
  id: string;
  eventId: string;
  row: string;
  number: number;
  status: SeatStatus;
}

export interface ReservationResponse {
  status: "RESERVED" | "SOLD_OUT";
  reservationId?: string;
  expiresAt?: string;
  replay?: boolean;
}

export interface ReservationDetailsResponse {
  id: string;
  eventId: string;
  seatIds: string[];
  userId: string;
  status: ReservationStatus;
  expiresAt: string;
  createdAt: string;
}

export interface OrderDetailsResponse {
  id: string;
  reservationId: string;
  userId: string;
  eventId: string;
  seatIds: string[];
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
}

export interface HealthResponse {
  status: HealthStatus;
  instanceId: string;
  services: {
    redis: HealthStatus;
    postgres: HealthStatus;
    kafka: HealthStatus;
  };
}

export interface RecentEvent {
  id: string;
  kind: "reservation" | "order" | "system";
  label: string;
  timestamp: string;
}

export interface MetricsResponse {
  totalSeats: number;
  availableSeats: number;
  lockedSeats: number;
  soldSeats: number;
  reservationAttempts: number;
  successfulReservations: number;
  soldOutResponses: number;
  duplicateRequestsPrevented: number;
  ordersCreated: number;
  duplicateEventsPrevented: number;
  recentEvents: RecentEvent[];
}

export interface ReservationCreatedEvent {
  eventId: string;
  eventType: "RESERVATION_CREATED";
  reservationId: string;
  userId: string;
  concertEventId: string;
  seatIds: string[];
  timestamp: string;
}

export interface SocketEnvelope<TPayload = Record<string, unknown>> {
  room: string;
  event:
    | "reservation:created"
    | "order:processing"
    | "order:confirmed"
    | "order:failed"
    | "seat:locked"
    | "seat:sold";
  payload: TPayload;
}

export interface SeatLockedSocketPayload {
  eventId: string;
  seatIds: string[];
  expiresAt: string;
}

export interface SeatSoldSocketPayload {
  eventId: string;
  seatIds: string[];
}

export interface ReservationCreatedSocketPayload {
  reservationId: string;
  expiresAt: string;
  eventId: string;
  seatIds: string[];
}

export interface OrderSocketPayload {
  reservationId: string;
  orderId: string;
  status: OrderStatus;
  updatedAt: string;
}

export interface LuaReserveResult {
  code: "RESERVED" | "SOLD_OUT" | "REPLAY" | "IN_PROGRESS";
  reservationId?: string;
  expiresAt?: string;
  replay?: boolean;
}

export const reserveRequestSchema = z.object({
  userId: z.string().min(1),
  idempotencyKey: z.string().min(1),
  seatIds: z.array(z.string()).min(1).max(10)
});

export const sendOtpSchema = z.object({
  email: z.string().email()
});

export const registerRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().optional(),
  otp: z.string().length(6)
});

export const authRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().optional()
});

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role?: string;
  };
}

export const eventParamsSchema = z.object({
  id: z.string().min(1)
});

export const reservationParamsSchema = z.object({
  id: z.string().min(1)
});

export const orderParamsSchema = z.object({
  id: z.string().min(1)
});

export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().default("postgresql://flashdrop:flashdrop@localhost:5432/flashdrop?schema=public"),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  KAFKA_BROKERS: z.string().default("localhost:9092"),
  KAFKA_CLIENT_ID: z.string().default("flashdrop-platform"),
  KAFKA_GROUP_ID: z.string().default("order-worker-group"),
  KAFKA_TOPIC_RESERVATION_CREATED: z.string().default(RESERVATION_TOPIC),
  API_PORT: z.coerce.number().default(3000),
  SOCKET_GATEWAY_PORT: z.coerce.number().default(3002),
  SOCKET_REDIS_CHANNEL: z.string().default(SOCKET_EVENTS_CHANNEL),
  DEMO_EVENT_ID: z.string().default(DEMO_EVENT_ID),
  RESERVATION_TTL_SECONDS: z.coerce.number().default(DEFAULT_RESERVATION_TTL_SECONDS)
});

export function parseEnv(input: NodeJS.ProcessEnv) {
  return envSchema.parse(input);
}

export function seatLockKey(seatId: string) {
  return `flashdrop:seat:${seatId}:lock`;
}

export function reservationKey(reservationId: string) {
  return `flashdrop:reservation:${reservationId}`;
}

export function idempotencyKey(idempotencyToken: string) {
  return `flashdrop:idempotency:${idempotencyToken}`;
}

export function reservationRoom(reservationId: string) {
  return `reservation:${reservationId}`;
}

export function eventRoom(eventId: string) {
  return `event:${eventId}`;
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(amount);
}

export * from "./mailer";

