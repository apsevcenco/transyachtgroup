import test from "node:test";
import assert from "node:assert/strict";
import { changesPublicContent } from "./siteRebuild.ts";

test("content edits trigger a rebuild", () => {
  for (const [method, path] of [
    ["POST", "/api/admin/guides"],
    ["PUT", "/api/admin/news/12"],
    ["DELETE", "/api/admin/answers/3"],
    ["POST", "/api/vehicles"],
    ["PUT", "/api/vehicles/5"],
    ["DELETE", "/api/vehicles/5"],
    ["POST", "/api/admin/vehicles/5/restore"],
    ["PUT", "/api/content/about_text"],
    ["POST", "/api/admin/guides/7/refresh"],
  ]) assert.equal(changesPublicContent(method, path), true, `${method} ${path}`);
});

test("reads and AI helper calls do not trigger a rebuild", () => {
  for (const [method, path] of [
    ["GET", "/api/admin/guides"],
    ["GET", "/api/vehicles"],
    ["POST", "/api/admin/guides/generate"],
    ["POST", "/api/admin/news/fix-seo"],
    ["POST", "/api/admin/answers/audit"],
    ["POST", "/api/admin/guides/search-metrics"],
    ["POST", "/api/admin/partner-contacts"],
    ["POST", "/api/requests"],
    ["POST", "/api/analytics/event"],
  ]) assert.equal(changesPublicContent(method, path), false, `${method} ${path}`);
});
