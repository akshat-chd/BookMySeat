# 🎟️ BookMySeat 

> **Distributed, High-Concurrency Event & Movie Ticket Reservation Platform**  
> Built with Next.js, Node.js, PostgreSQL, Redis, Apache Kafka, Socket.IO, Nginx, and PM2.

[![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?logo=node.js)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15.x-000000?logo=next.js)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16.0-4169E1?logo=postgresql)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7.x-DC382D?logo=redis)](https://redis.io/)
[![Apache Kafka](https://img.shields.io/badge/Apache%20Kafka-3.9-231F20?logo=apachekafka)](https://kafka.apache.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6.x-2D3748?logo=prisma)](https://www.prisma.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?logo=tailwindcss)](https://tailwindcss.com/)

---

## 📌 Executive Summary

**BookMySeat** (also known as *FlashDrop*) is an enterprise-grade, distributed web application engineered to demonstrate high-concurrency ticket reservations under extreme write contention (e.g., flash sales, Coldplay concert tickets, blockbuster movie premieres).

### Key Architectural Invariants Guaranteed
1. **Zero Overselling / Double-Booking**: Atomic seat locking using Redis Lua scripts eliminates `GET -> IF -> DECR` race conditions across distributed web servers.
2. **Strict Idempotency**: Identical requests (matching idempotency keys) yield deterministic replays without duplicate seat reservations or stock decrements.
3. **At-Least-Once Delivery Protection**: An idempotent Kafka consumer (`ProcessedEvent` table) drops duplicate messages from network redeliveries.
4. **Real-Time Synchronizations**: WebSocket updates via Redis Pub/Sub notify all connected users instantaneously as seats are selected, reserved, or confirmed.
5. **High Availability & Fault Tolerance**: Stateless Express API replicas behind Nginx ensure seamless horizontal scaling.

---

## 🏗️ System Architecture

```text
                               +-----------------------------+
                               |     Next.js Web Frontend    |
                               |    (React 19 / Tailwind)    |
                               +--------------+--------------+
                                              |
                                      REST & WebSockets
                                              |
                                 +------------v------------+
                                 |   Nginx Reverse Proxy   |
                                 |       (Port 80)         |
                                 +------------+------------+
                                              |
                  +---------------------------+---------------------------+
                  |                           |                           |
         +--------v--------+         +--------v--------+         +--------v--------+
         |   Express API   |         | Socket Gateway  |         |  Next.js Server |
         |   (Port 3000)   |         |   (Port 3002)   |         |   (Port 3001)   |
         +--------+--------+         +--------^--------+         +-----------------+
                  |                           |
        +---------+---------+                 |
        |                   |           Redis Pub/Sub
 +------v------+     +------v------+          |
 | PostgreSQL  |     |   Redis 7   +----------+
 | (Port 5432) |     | (Port 6379) |
 +-------------+     +------+------+
                            |
                   Reservation Created Event
                            |
                     +------v------+
                     | Kafka 3.9   |
                     | (Port 9092) |
                     +------+------+
                            |
                     +------v------+
                     |    Order    |
                     |   Worker    |
                     +-------------+
```

---

## 🔄 End-to-End Request Lifecycle

```text
[Client] ---> 1. POST /api/events/:id/seats/reserve (Idempotency Key, seatIds)
  |
  +---------> 2. Execute Redis Lua Script (Check seat lock & TTL)
  |                |---> [Lock Acquired]: Write `flashdrop:reservation:<id>`
  |
  +---------> 3. Persist ACTIVE Reservation in PostgreSQL
  |
  +---------> 4. Publish `reservation.created` event to Kafka Topic
  |
  +---------> 5. Express API returns 202 RESERVED with Reservation ID
  |
  +---------> 6. Order Worker consumes Kafka event
  |                |---> Check `ProcessedEvent` table (Deduplicate)
  |                |---> Transactionally create Order & update Seat status to BOOKED
  |                |---> Publish `order:confirmed` to Redis Pub/Sub
  |
  +---------> 7. Socket Gateway broadcasts update to client room `/checkout/[id]`
  |
[Client] <--- 8. Frontend receives socket event or queries fallback REST API -> Render "Tickets Confirmed! 🎉"
```

---

## 📦 Repository Layout

```text
System Design project/
├── apps/
│   ├── api/              # Express REST API (Auth, Events, Seat Reservations, Health)
│   ├── order-worker/     # Kafka Consumer Service (Async Order Creation & DB Confirmation)
│   ├── socket-gateway/   # Socket.IO Gateway (Relays Redis Pub/Sub events to WebClients)
│   └── web/              # Next.js App Router (Seat Grid, Checkout, OTP Auth, Ticket View)
├── packages/
│   ├── database/         # Prisma Schema, Migrations, HD Seed Data
│   └── shared/           # Zod Schemas, Environment Loaders, Types, Metric Keys
├── infra/
│   └── nginx/            # Nginx Configuration & Reverse Proxy Rules
├── load-tests/           # k6 Load Testing Scripts (Flash sale concurrency, Idempotency)
├── docker-compose.yml    # Infrastructure Container Manifest (Postgres, Redis, Kafka)
├── deploy.sh             # Production EC2 Deployment Script
└── README.md             # Project Documentation
```

---

## ⚡ Core Features & Engineering Highlights

### 1. Atomic Seat Reservations via Redis Lua Scripts
To guarantee that two users clicking the same seat simultaneously will never both reserve it, the API delegates seat evaluation and locking to an in-memory **Redis Lua Script**:
- Evaluates idempotency token first (replays cached responses on retry).
- Checks whether requested `seatIds` are already locked under key `flashdrop:seat:<id>:lock`.
- If available, locks the seats with a configurable TTL (e.g. 120 seconds), stores reservation state, and updates real-time reservation metrics atomically.

### 2. 2-Step OTP User Registration
- Step 1: User submits email $\rightarrow$ API generates a secure 6-digit numeric OTP stored in Redis under `flashdrop:otp:<email>` with a **300-second TTL**.
- Step 2: User inputs OTP $\rightarrow$ API verifies code against Redis before creating the user in PostgreSQL and issuing a signed **JWT authentication token**.

### 3. Graceful Fallbacks & Resilient Frontend State
- **REST Status Fallback**: During checkout, if WebSocket connections drop or events arrive before the client joins the Socket room, the frontend queries `GET /api/reservations/:id` to guarantee state transition to `"Tickets Confirmed!"`.
- **Image Fallback System**: Defensive image components (`MovieCardImage`, `EventBanner`, `EventPoster`) gracefully render themed UI gradient skeletons if external image CDN requests fail.
- **User Auto-Provisioning**: Prevents foreign key database crashes (`Reservation_userId_fkey`) if a user session is active during database re-seeding.

---

## 📊 Database Schema (Prisma ORM)

```prisma
enum Role {
  USER
  ADMIN
}

enum SeatStatus {
  AVAILABLE
  RESERVED
  BOOKED
}

enum ReservationStatus {
  ACTIVE
  EXPIRED
  COMPLETED
  CANCELLED
}

enum OrderStatus {
  PENDING
  CONFIRMED
  FAILED
}

model User {
  id           String        @id @default(uuid())
  email        String        @unique
  passwordHash String
  name         String
  role         Role          @default(USER)
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
  reservations Reservation[]
  orders       Order[]
}

model Event {
  id          String        @id @default(uuid())
  name        String
  description String
  price       Int
  posterUrl   String?
  bannerUrl   String?
  genre       String?
  duration    Int?
  releaseDate DateTime?
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
  seats       Seat[]
  orders      Order[]
  Reservation Reservation[]
}

model Seat {
  id            String        @id @default(uuid())
  eventId       String
  row           String
  number        Int
  status        SeatStatus    @default(AVAILABLE)
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
  event         Event         @relation(fields: [eventId], references: [id])
  reservations  Reservation[] @relation("ReservationSeats")
  orders        Order[]       @relation("OrderSeats")

  @@unique([eventId, row, number])
}

model Reservation {
  id        String            @id @default(uuid())
  eventId   String
  userId    String
  status    ReservationStatus @default(ACTIVE)
  expiresAt DateTime
  createdAt DateTime          @default(now())
  updatedAt DateTime          @updatedAt
  event     Event             @relation(fields: [eventId], references: [id])
  user      User              @relation(fields: [userId], references: [id])
  seats     Seat[]            @relation("ReservationSeats")
  orders    Order[]
}

model Order {
  id            String      @id @default(uuid())
  reservationId String
  userId        String
  eventId       String
  status        OrderStatus @default(PENDING)
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
  reservation   Reservation @relation(fields: [reservationId], references: [id])
  user          User        @relation(fields: [userId], references: [id])
  event         Event       @relation(fields: [eventId], references: [id])
  seats         Seat[]      @relation("OrderSeats")
}

model ProcessedEvent {
  eventId     String   @id
  processedAt DateTime @default(now())
}
```

---

## 🛠️ API & WebSocket Specification

### Authentication Endpoints
| Method | Endpoint | Description | Payload / Query |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/send-otp` | Generate & send 6-digit OTP code | `{ "email": "user@example.com" }` |
| `POST` | `/api/auth/register` | Verify OTP code & register user | `{ "email": "...", "password": "...", "name": "...", "otp": "123456" }` |
| `POST` | `/api/auth/login` | Authenticate user & return JWT token | `{ "email": "...", "password": "..." }` |

### Events & Seats Endpoints
| Method | Endpoint | Description | Payload / Query |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/events` | List all active movies & events | None |
| `GET` | `/api/events/:id` | Get details for specific event | `id` (Event UUID) |
| `GET` | `/api/events/:id/seats` | Get seat matrix layout & availability | `id` (Event UUID) |
| `POST` | `/api/events/:id/seats/reserve` | Atomic seat reservation (Lua script) | `{ "userId": "...", "idempotencyKey": "...", "seatIds": [...] }` |

### Reservations & Orders Endpoints
| Method | Endpoint | Description | Payload / Query |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/reservations/:id` | Get reservation status & order link | `id` (Reservation UUID) |
| `GET` | `/api/orders/user/:userId` | Get user order history & QR tickets | `userId` (User UUID) |

### System & Admin Endpoints
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Health status of Redis, PostgreSQL, and Kafka |
| `POST` | `/api/admin/reset-demo` | Reset database stock, seats, and metrics |

---

## 🚀 Local Development Setup

### 1. Prerequisites
- **Node.js**: v20.x or later
- **Docker & Docker Compose**: v2.x or later

### 2. Environment Setup
Clone the repository and copy the `.env.example` file:
```bash
cp .env.example .env
```

### 3. Install Dependencies & Generate Prisma Client
```bash
npm install
npm run prisma:generate
```

### 4. Start Infrastructure Containers
Launch PostgreSQL, Redis, and Kafka:
```bash
docker compose up -d
```

### 5. Push Database Schema & Seed Data
```bash
npm run prisma:migrate
npm run db:seed
```

### 6. Start Development Microservices
Run the Next.js frontend, Express API, Order Worker, and Socket Gateway concurrently:
```bash
# In separate terminal tabs or terminal windows:
npm run dev:api       # Express REST API (Port 3000)
npm run dev:web       # Next.js Web App (Port 3001)
npm run dev:socket    # Socket Gateway (Port 3002)
npm run dev:worker    # Kafka Order Worker
```

Access the application in your browser:
- **Web App**: `http://localhost:3001`
- **API Health**: `http://localhost:3000/health`

---

## 🌐 Production AWS EC2 Deployment

### 1. EC2 Instance Requirements
- **OS**: Ubuntu 24.04 LTS / 22.04 LTS
- **Instance Type**: `t3.small` or `t3.medium` (Minimum 2GB RAM for Kafka KRaft mode)
- **Open Inbound Ports**: 80 (HTTP), 22 (SSH)

### 2. Deployment Script (`deploy.sh`)
The automated deployment script handles full setup:
```bash
ssh -i "/path/to/keypair.pem" ubuntu@<YOUR_EC2_IP>
cd /home/ubuntu/bookmyseat
bash deploy.sh
```

### 3. Process Management via PM2
PM2 runs all Node services in the background:
```bash
pm2 list          # Check running processes
pm2 logs api      # View API logs
pm2 restart all   # Restart all microservices
```

---

## 📈 Load Testing & Concurrency Benchmarks

Included k6 scripts simulate flash sale concurrency:

### 1. Concurrency Reservation Test
Simulates 1,000 concurrent Virtual Users (VUs) attempting to reserve 100 available seats:
```bash
k6 run -e BASE_URL=http://localhost:3000/api -e VUS=1000 -e ITERATIONS=1000 load-tests/flash-sale.js
```

### 2. Idempotency Key Test
Simulates network retries sending duplicate idempotency keys:
```bash
k6 run -e BASE_URL=http://localhost:3000/api load-tests/idempotency.js
```

### Expected Results
- **Initial Seats Available**: `100`
- **Successful Reservations**: `100`
- **Oversold Seats**: `0`
- **Idempotency Match Accuracy**: `100%`

---

## 💡 System Design Interview Questions & Answers

### Q1: Why use Redis for seat reservation instead of writing directly to PostgreSQL?
> **Answer**: High-concurrency seat reservation creates extreme database row locking and write contention. PostgreSQL row locks under thousands of concurrent requests result in connection pool exhaustion and high latency. Redis executes operations in single-threaded event loops; combining this with a Lua script provides sub-millisecond atomic validation and stock decrement without touching disk I/O.

### Q2: How does the system prevent overselling under high concurrency?
> **Answer**: Through an atomic Redis Lua script. The script performs a `HEXISTS` check on the seat lock key, verifies seat availability, locks the seat IDs under a single transaction block in Redis, and sets a 120-second TTL. Because Redis processes Lua scripts atomically, no second request can read stale seat state during execution.

### Q3: Why is Apache Kafka used in this architecture?
> **Answer**: Kafka decouples fast user-facing reservation acceptance (~15ms response time) from heavy order creation workflows (database transactions, PDF ticket generation, payment gateway processing). This ensures the web API remains responsive even when order processing experiences downstream spikes.

### Q4: How is duplicate order creation prevented if Kafka redelivers a message?
> **Answer**: The Order Worker consumer implements an **Idempotent Consumer Pattern**. Before creating an `Order` row in PostgreSQL, it checks the `ProcessedEvent` table inside a database transaction. If the `eventId` has already been recorded, the worker acknowledges the Kafka message and skips order creation.

### Q5: Why is Nginx used in front of Node.js services?
> **Answer**: Nginx acts as a high-performance reverse proxy and load balancer. It handles client SSL termination, static file caching, compression, and distributes inbound HTTP traffic across multiple stateless Express API worker processes.

---

## 📝 License

Distributed under the MIT License. See `LICENSE` for details.
