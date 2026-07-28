# FlashDrop

FlashDrop is a runnable portfolio project for demonstrating distributed-systems fundamentals through a constrained flash-sale demo. The product has 100 units. Thousands of clients can attempt to reserve it concurrently. The system is designed to prove the important invariants: no overselling, no duplicate stock decrements for the same idempotency key, and no duplicate orders from repeated Kafka delivery.

## Stack

- Frontend: Next.js, TypeScript, Tailwind CSS
- API: Node.js, Express, TypeScript
- Data: PostgreSQL with Prisma
- Atomic reservation + metrics: Redis
- Event streaming: Kafka
- Real-time updates: Socket.IO
- Load balancing: NGINX
- Local infra: Docker Compose
- Load tests: k6

## Architecture

```text
                    Next.js Frontend
                           |
                   REST + WebSockets
                           |
                          NGINX
                           |
                -----------------------
                |          |          |
              API 1      API 2      API 3
                |          |          |
                -----------------------
                     |           |
                   Redis     PostgreSQL
                     |
                   Kafka
                     |
                 Order Worker
```

## Request Flow

1. The sale page loads `GET /api/products/:id`.
2. The user clicks `Buy Now` and sends `POST /api/products/:id/reserve`.
3. A Redis Lua script checks idempotency, checks stock, decrements stock once, writes reservation state, applies TTL, and updates metrics atomically.
4. The API persists the reservation in PostgreSQL and publishes `reservation.created` to Kafka.
5. The worker consumes the event, rejects duplicate `eventId`s, creates a `PENDING` order, then confirms it.
6. Socket events are published through Redis pub/sub to the dedicated gateway, and the browser receives live updates without refresh.

## Why Each Component Exists

- Redis: shared stock state, TTL reservation state, and live demo metrics with atomic counters.
- Lua script: prevents the classic race where concurrent requests read stock before decrementing.
- Kafka: decouples fast reservation acceptance from slower order creation work.
- Idempotent consumer: Kafka can redeliver messages; `ProcessedEvent` prevents duplicate orders.
- Stateless API instances: NGINX can safely route traffic to any replica because no critical state lives only in memory.
- WebSockets: browser order status moves from `RESERVED` to `PROCESSING` to `CONFIRMED` without polling every reservation.

## Repository Layout

```text
apps/
  web/
  api/
  order-worker/
  socket-gateway/
packages/
  database/
  shared/
infra/nginx/
loapose up --build
```d-tests/
docker-compose.yml
```

## Running Locally

1. Copy `.env.example` to `.env` if you want local overrides.
2. Install dependencies:

```bash
npm install
```

3. Generate Prisma client:

```bash
npm run prisma:generate
```

4. Start infrastructure and services:

```bash
docker com

5. Open:

- Sale page: `http://localhost:8080`
- Dashboard: `http://localhost:8080/dashboard`
- Health endpoint: `http://localhost:8080/health`

## Demo Controls

- Reset demo:

```bash
curl -X POST http://localhost:8080/api/admin/reset-demo
```

- Publish duplicate Kafka event:

```bash
curl -X POST http://localhost:8080/api/admin/publish-duplicate-event
```

## Load Tests

Small:

```bash
k6 run -e BASE_URL=http://localhost:8080/api load-tests/flash-sale.js
```

Medium:

```bash
k6 run -e BASE_URL=http://localhost:8080/api -e VUS=1000 -e ITERATIONS=1000 load-tests/flash-sale.js
```

Large:

```bash
k6 run -e BASE_URL=http://localhost:8080/api -e VUS=1000 -e ITERATIONS=10000 load-tests/flash-sale.js
```

Idempotency:

```bash
k6 run -e BASE_URL=http://localhost:8080/api load-tests/idempotency.js
```

Expected result after a high-concurrency run:

- Initial stock: `100`
- Successful reservations: `100`
- Oversold items: `0`

## Tradeoffs

- Reservation expiry stock restoration is intentionally deferred. Redis TTL exists in v1, but reliable stock restoration is Phase 2 work.
- Metrics are backend-owned and polled by the dashboard. They are not fabricated in the frontend.
- A dedicated Socket.IO gateway is used instead of a Redis adapter across API instances to keep the multi-replica story easy to explain.

## Interview Talking Points

- Why Redis instead of only PostgreSQL?
  Redis gives cheap atomic stock mutation and fast shared counters under heavy write contention.
- Why use a Lua script?
  It makes the multi-step reservation mutation execute as one atomic operation inside Redis.
- What race condition are we preventing?
  The `GET stock -> if stock > 0 -> DECR` race that lets concurrent buyers oversell inventory.
- Why Kafka?
  It separates low-latency reservation acceptance from asynchronous order processing.
- What happens if Kafka delivers an event twice?
  `ProcessedEvent.eventId` ensures the worker ignores the duplicate and does not create a second order.
- Why is the API stateless?
  Because NGINX can send any request to any API replica without breaking shared behavior.
- What does the load balancer do?
  It round-robins `/api` traffic across identical API instances.
- Why WebSockets?
  They push reservation and order-state changes immediately instead of forcing tight polling loops.
- What is the current bottleneck?
  Redis and Kafka are single-instance demo services in this local setup.
- How would this scale to one million users?
  Partition Kafka deliberately, shard stock domains, add Redis high availability, and split read/write concerns more aggressively.
- What would happen if Redis failed?
  Reservation acceptance and live metrics would stop because the atomic stock gate is unavailable.
- What would happen if Kafka failed?
  New reservations could be compensated and rolled back because the async order handoff would be unavailable.
