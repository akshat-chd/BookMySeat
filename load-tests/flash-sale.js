import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL = __ENV.BASE_URL || "http://localhost:8080/api";
const PRODUCT_ID = __ENV.PRODUCT_ID || "demo-product";

export const options = {
  scenarios: {
    small: {
      executor: "shared-iterations",
      vus: Number(__ENV.VUS || 100),
      iterations: Number(__ENV.ITERATIONS || 100)
    }
  }
};

export default function () {
  const userId = `user-${__VU}-${__ITER}`;
  const idempotencyKey = `attempt-${__VU}-${__ITER}-${Date.now()}`;
  const payload = JSON.stringify({ userId, idempotencyKey });
  const response = http.post(`${BASE_URL}/products/${PRODUCT_ID}/reserve`, payload, {
    headers: { "Content-Type": "application/json" }
  });

  check(response, {
    "response is reserved or sold out": (res) => res.status === 201 || res.status === 202 || res.status === 409
  });

  sleep(0.05);
}
