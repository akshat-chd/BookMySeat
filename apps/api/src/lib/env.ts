import { parseEnv } from "@flashdrop/shared";
import type { ApiEnv } from "../types";

export function loadEnv(): ApiEnv {
  return parseEnv(process.env);
}
