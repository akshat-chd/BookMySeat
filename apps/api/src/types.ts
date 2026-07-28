import type { Producer } from "kafkajs";
import type { prisma } from "@flashdrop/database";
import type { RecentEvent } from "@flashdrop/shared";
import type { FlashdropRedis } from "./lib/redis";

export interface ApiEnv {
  NODE_ENV: "development" | "test" | "production";
  DATABASE_URL: string;
  REDIS_URL: string;
  KAFKA_BROKERS: string;
  KAFKA_CLIENT_ID: string;
  KAFKA_GROUP_ID: string;
  KAFKA_TOPIC_RESERVATION_CREATED: string;
  API_PORT: number;
  SOCKET_GATEWAY_PORT: number;
  SOCKET_REDIS_CHANNEL: string;
  DEMO_EVENT_ID: string;
  RESERVATION_TTL_SECONDS: number;
}

export interface ApiContext {
  env: ApiEnv;
  instanceId: string;
  redis: FlashdropRedis;
  kafkaProducer: Producer;
  kafkaConnected: boolean;
  prisma: typeof prisma;
}

export interface IdempotencyPayload {
  state: "PENDING" | "COMPLETED";
  status?: "RESERVED" | "SOLD_OUT";
  reservationId?: string;
  expiresAt?: string;
}

export interface RecentEventRecord extends RecentEvent {}
