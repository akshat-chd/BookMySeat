import http from "k6/http";
import { check } from "k6";

const BASE_URL = __ENV.BASE_URL || "http://localhost:8080/api";
const PRODUCT_ID = __ENV.PRODUCT_ID || "demo-product";

export const options = {
  vus: 1,
  iterations: 1
};

export default function () {
  const userId = "idempotency-tester";
  const idempotencyKey = `replay-${Date.now()}`;
  const payload = JSON.stringify({ userId, idempotencyKey });

  const responses = [1, 2, 3].map(() =>
    http.post(`${BASE_URL}/products/${PRODUCT_ID}/reserve`, payload, {
      headers: { "Content-Type": "application/json" }
    })
  );

  check(responses, {
    "all responses are accepted, queued, or replayed": (items) =>
      items.every((response) => [201, 202, 409].includes(response.status))
  });
}
