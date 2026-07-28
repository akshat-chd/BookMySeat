import type {
  HealthResponse,
  MetricsResponse,
  EventResponse,
  SeatResponse,
  ReservationResponse
} from "@flashdrop/shared";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {})
    },
    cache: "no-store"
  });

  if (!response.ok && response.status !== 409 && response.status !== 202) {
    const body = await response.text();
    throw new Error(body || "Request failed");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export function getEvents() {
  return request<EventResponse[]>("/events");
}

export function getEvent(eventId: string) {
  return request<EventResponse>(`/events/${eventId}`);
}

export function searchEvents(query: string) {
  return request<EventResponse[]>(`/events/search?q=${encodeURIComponent(query)}`);
}

export function getSeats(eventId: string) {
  return request<SeatResponse[]>(`/events/${eventId}/seats`);
}

export function reserveSeat(eventId: string, seatIds: string[], userId: string, idempotencyKey: string) {
  return request<ReservationResponse>(`/events/${eventId}/seats/reserve`, {
    method: "POST",
    body: JSON.stringify({ userId, idempotencyKey, seatIds })
  });
}

export function getHealth() {
  return request<HealthResponse>("/../health");
}

export function getMetrics() {
  return request<MetricsResponse>("/metrics");
}

export function getUserOrders(userId: string) {
  return request<any[]>(`/users/${userId}/orders`);
}

export function sendOtp(email: string) {
  return request<{ message: string; otp: string }>("/auth/send-otp", {
    method: "POST",
    body: JSON.stringify({ email })
  });
}

export function getReservation(reservationId: string) {
  return request<any>(`/reservations/${reservationId}`);
}

export function resetDemo() {
  return request<void>("/admin/reset-demo", {
    method: "POST"
  });
}

export function publishDuplicateEvent() {
  return request<{ status: string }>("/admin/publish-duplicate-event", {
    method: "POST"
  });
}
