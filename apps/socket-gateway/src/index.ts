import { createServer } from "node:http";
import { parseEnv, reservationRoom, SOCKET_EVENTS_CHANNEL, type SocketEnvelope } from "@flashdrop/shared";
import { createClient } from "redis";
import { Server } from "socket.io";

async function bootstrap() {
  const env = parseEnv(process.env);
  const httpServer = createServer((req, res) => {
    if (req.url === "/health") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ status: "up" }));
      return;
    }

    res.writeHead(404);
    res.end();
  });

  const io = new Server(httpServer, {
    path: "/socket.io",
    cors: {
      origin: "*"
    }
  });

  const subscriber = createClient({ url: env.REDIS_URL });
  await subscriber.connect();

  io.on("connection", (socket) => {
    socket.on("join-reservation", (reservationId: string) => {
      socket.join(reservationRoom(reservationId));
    });
  });

  await subscriber.subscribe(env.SOCKET_REDIS_CHANNEL || SOCKET_EVENTS_CHANNEL, (message) => {
    const envelope = JSON.parse(message) as SocketEnvelope;
    io.to(envelope.room).emit(envelope.event, envelope.payload);
  });

  httpServer.listen(env.SOCKET_GATEWAY_PORT, () => {
    console.log(`Socket gateway listening on ${env.SOCKET_GATEWAY_PORT}`);
  });

  const shutdown = async () => {
    await Promise.allSettled([
      subscriber.quit(),
      new Promise<void>((resolve, reject) =>
        httpServer.close((error) => (error ? reject(error) : resolve()))
      )
    ]);
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
