import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createAdminSessionToken,
  verifyAdminSessionToken,
  validateAdminPassword,
} from "../src/lib/auth.ts";

test("session admin valide avec le bon secret", () => {
  process.env.BULLE_ADMIN_SECRET = "test-secret-12345678";
  const token = createAdminSessionToken("test-secret-12345678");
  assert.equal(verifyAdminSessionToken(token, "test-secret-12345678"), true);
  assert.equal(validateAdminPassword("test-secret-12345678"), true);
  assert.equal(validateAdminPassword("wrong"), false);
});
