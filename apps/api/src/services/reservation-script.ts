import {
  idempotencyKey,
  metricsKeys,
  reservationKey,
  seatLockKey,
  type LuaReserveResult
} from "@flashdrop/shared";
import type { FlashdropRedis } from "../lib/redis";

const RESERVE_SEATS_LUA = `
local numSeats = tonumber(ARGV[1])

local reservationKey = KEYS[numSeats + 1]
local idempotencyKey = KEYS[numSeats + 2]
local reservationAttemptsKey = KEYS[numSeats + 3]
local successfulReservationsKey = KEYS[numSeats + 4]
local soldOutResponsesKey = KEYS[numSeats + 5]
local duplicateRequestsKey = KEYS[numSeats + 6]

local reservationId = ARGV[2]
local userId = ARGV[3]
local eventId = ARGV[4]
local seatIdsJson = ARGV[5]
local ttlSeconds = tonumber(ARGV[6])
local expiresAt = ARGV[7]

local existing = redis.call("GET", idempotencyKey)
if existing then
  redis.call("INCR", duplicateRequestsKey)
  local parsed = cjson.decode(existing)
  return { parsed["state"], parsed["status"] or "", parsed["reservationId"] or "", parsed["expiresAt"] or "" }
end

redis.call("INCR", reservationAttemptsKey)

-- Check if ANY seat is locked
for i=1, numSeats do
  if redis.call("EXISTS", KEYS[i]) == 1 then
    redis.call("INCR", soldOutResponsesKey)
    redis.call("SET", idempotencyKey, cjson.encode({ state = "COMPLETED", status = "SOLD_OUT" }), "EX", ttlSeconds)
    return { "COMPLETED", "SOLD_OUT", "", "" }
  end
end

-- Lock ALL seats
for i=1, numSeats do
  redis.call("SET", KEYS[i], userId, "EX", ttlSeconds)
end

redis.call("HSET", reservationKey,
  "reservationId", reservationId,
  "userId", userId,
  "eventId", eventId,
  "seatIds", seatIdsJson,
  "status", "ACTIVE",
  "expiresAt", expiresAt
)
redis.call("EXPIRE", reservationKey, ttlSeconds)

redis.call("SET", idempotencyKey, cjson.encode({
  state = "PENDING",
  status = "RESERVED",
  reservationId = reservationId,
  expiresAt = expiresAt
}), "EX", ttlSeconds)

redis.call("INCR", successfulReservationsKey)

return { "PENDING", "RESERVED", reservationId, expiresAt }
`;

export async function runReservationScript(
  redis: FlashdropRedis,
  args: {
    eventId: string;
    seatIds: string[];
    idempotencyToken: string;
    reservationId: string;
    userId: string;
    ttlSeconds: number;
    expiresAt: string;
  }
): Promise<LuaReserveResult> {
  const seatKeys = args.seatIds.map(id => seatLockKey(id));
  
  const reply = (await redis.eval(RESERVE_SEATS_LUA, {
    keys: [
      ...seatKeys,
      reservationKey(args.reservationId),
      idempotencyKey(args.idempotencyToken),
      metricsKeys.reservationAttempts,
      metricsKeys.successfulReservations,
      metricsKeys.soldOutResponses,
      metricsKeys.duplicateRequestsPrevented
    ],
    arguments: [
      String(args.seatIds.length),
      args.reservationId,
      args.userId,
      args.eventId,
      JSON.stringify(args.seatIds),
      String(args.ttlSeconds),
      args.expiresAt
    ]
  })) as string[];

  const [state, status, reservationIdValue, expiresAtValue] = reply;

  if (status === "SOLD_OUT") {
    return { code: "SOLD_OUT" };
  }

  if (state === "COMPLETED") {
    return {
      code: "REPLAY",
      reservationId: reservationIdValue,
      expiresAt: expiresAtValue,
      replay: true
    };
  }

  if (state === "PENDING" && reservationIdValue && expiresAtValue) {
    return {
      code: "RESERVED",
      reservationId: reservationIdValue,
      expiresAt: expiresAtValue
    };
  }

  return {
    code: "IN_PROGRESS",
    reservationId: reservationIdValue,
    expiresAt: expiresAtValue,
    replay: true
  };
}

export async function finalizeIdempotency(
  redis: FlashdropRedis,
  token: string,
  payload: { status: "RESERVED" | "SOLD_OUT"; reservationId?: string; expiresAt?: string },
  ttlSeconds: number
) {
  await redis.set(
    idempotencyKey(token),
    JSON.stringify({
      state: "COMPLETED",
      status: payload.status,
      reservationId: payload.reservationId,
      expiresAt: payload.expiresAt
    }),
    { EX: ttlSeconds }
  );
}

export async function waitForCompletedIdempotency(
  redis: FlashdropRedis,
  token: string,
  timeoutMs = 500
) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const currentValue = await redis.get(idempotencyKey(token));
    if (!currentValue) {
      return null;
    }

    const parsed = JSON.parse(currentValue) as {
      state: "PENDING" | "COMPLETED";
      status: "RESERVED" | "SOLD_OUT";
      reservationId?: string;
      expiresAt?: string;
    };

    if (parsed.state === "COMPLETED") {
      return parsed;
    }

    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  return null;
}

export async function rollbackReservation(
  redis: FlashdropRedis,
  args: {
    seatIds: string[];
    idempotencyToken: string;
    reservationId: string;
  }
) {
  const multi = redis.multi();
  for (const id of args.seatIds) {
    multi.del(seatLockKey(id));
  }
  
  await multi
    .del(reservationKey(args.reservationId))
    .del(idempotencyKey(args.idempotencyToken))
    .decr(metricsKeys.successfulReservations)
    .exec();
}
