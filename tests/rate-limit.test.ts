import assert from "node:assert/strict";
import { test } from "node:test";
import {
  checkRateLimit,
  checkChatRateLimit,
} from "../src/lib/rate-limit.ts";

test("checkRateLimit bloque après la limite", () => {
  const key = `test-${Date.now()}`;
  assert.equal(checkRateLimit(key, 2, 60000).allowed, true);
  assert.equal(checkRateLimit(key, 2, 60000).allowed, true);
  const blocked = checkRateLimit(key, 2, 60000);
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.retryAfterSec);
});

test("checkChatRateLimit utilise une clé dédiée", async () => {
  const clientId = `client-${Date.now()}`;
  const result = await checkChatRateLimit(clientId);
  assert.equal(result.allowed, true);
});
