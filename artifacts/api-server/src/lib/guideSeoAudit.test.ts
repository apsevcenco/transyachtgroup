import test from "node:test";
import assert from "node:assert/strict";
import { auditGuide, textSimilarity } from "./guideSeoAudit.ts";

test("audit penalizes incomplete short content", () => {
  const result = auditGuide({ title: "Cannes cars", excerpt: "Short", content: "<p>Short text</p>", primaryKeyword: "luxury car rental Cannes" });
  assert.ok(result.score < 50);
  assert.ok(result.issues.some((issue) => issue.code === "content_short"));
});

test("similarity detects overlapping copy", () => {
  assert.ok(textSimilarity("Luxury car rental in Cannes with airport delivery", "Cannes luxury car rental and airport delivery guide") >= 35);
});
