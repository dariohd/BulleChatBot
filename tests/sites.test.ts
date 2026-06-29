import assert from "node:assert/strict";
import { test } from "node:test";
import { isAdminRequest } from "../src/lib/auth.ts";
import { isDomainAllowed, getSiteDomains } from "../src/lib/sites.ts";
import type { SiteConfig } from "../src/lib/types.ts";

const site: SiteConfig = {
  id: "test",
  name: "Test",
  domain: "example.com,www.client.fr",
  siteKey: "bulle_test",
  createdAt: new Date().toISOString(),
};

test("getSiteDomains normalise les domaines", () => {
  const domains = getSiteDomains(site);
  assert.deepEqual(domains, ["example.com", "client.fr"]);
});

test("isDomainAllowed accepte le domaine exact", () => {
  assert.equal(isDomainAllowed(site, "https://example.com"), true);
  assert.equal(isDomainAllowed(site, "https://www.client.fr"), true);
});

test("isDomainAllowed refuse un sous-domaine non listé", () => {
  assert.equal(isDomainAllowed(site, "https://app.example.com"), false);
  assert.equal(isDomainAllowed(site, "https://evil.example.com"), false);
});

test("isDomainAllowed refuse un domaine inconnu", () => {
  assert.equal(isDomainAllowed(site, "https://autre-site.com"), false);
});

test("isDomainAllowed refuse origin null en production Vercel", () => {
  const prevNodeEnv = process.env.NODE_ENV;
  const prevVercel = process.env.VERCEL;
  process.env.NODE_ENV = "production";
  process.env.VERCEL = "1";
  assert.equal(isDomainAllowed(site, null), false);
  process.env.NODE_ENV = prevNodeEnv;
  process.env.VERCEL = prevVercel;
});

test("isDomainAllowed autorise origin null en dev local", () => {
  const prevNodeEnv = process.env.NODE_ENV;
  const prevVercel = process.env.VERCEL;
  process.env.NODE_ENV = "development";
  delete process.env.VERCEL;
  assert.equal(isDomainAllowed(site, null), true);
  process.env.NODE_ENV = prevNodeEnv;
  if (prevVercel) process.env.VERCEL = prevVercel;
});

test("isAdminRequest valide le bearer token", () => {
  const prev = process.env.BULLE_ADMIN_SECRET;
  process.env.BULLE_ADMIN_SECRET = "test-secret";
  const req = new Request("http://localhost", {
    headers: { authorization: "Bearer test-secret" },
  });
  assert.equal(isAdminRequest(req), true);
  process.env.BULLE_ADMIN_SECRET = prev;
});
