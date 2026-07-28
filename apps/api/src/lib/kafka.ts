import { Kafka, type Producer } from "kafkajs";
import type { ReservationCreatedEvent } from "@flashdrop/shared";
import type { ApiEnv } from "../types";

export function createKafkaProducer(env: ApiEnv) {
  const kafka = new Kafka({
    clientId: env.KAFKA_CLIENT_ID,
    brokers: env.KAFKA_BROKERS.split(",").map((broker) => broker.trim())
  });

  return kafka.producer();
}

export async function publishReservationCreated(
  producer: Producer,
  topic: string,
  event: ReservationCreatedEvent
) {
  await producer.send({
    topic,
    messages: [
      {
        key: event.reservationId,
        value: JSON.stringify(event)
      }
    ]
  });
}
