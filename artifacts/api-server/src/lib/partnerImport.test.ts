import test from "node:test";
import assert from "node:assert/strict";
import { importKey, validateImportRows } from "./partnerImport.ts";

const good = { city: "Cannes", category: "hotel", organization: "Hotel Martinez", email: "Info@Martinez.com", phone: " +33 1 ", sourceCheckedAt: "2026-05-01" };

test("valid rows are trimmed and emails lower-cased", () => {
  const { rows, invalid } = validateImportRows([good]);
  assert.equal(invalid.length, 0);
  assert.equal(rows[0].email, "info@martinez.com");
  assert.equal(rows[0].phone, "+33 1");
  assert.equal(rows[0].sourceCheckedAt, "2026-05-01");
  assert.equal(rows[0].notes, null);
});

test("bad rows are reported with the reason and their position", () => {
  const { rows, invalid } = validateImportRows([
    good,
    { ...good, organization: "  " },
    { ...good, city: "" },
    { ...good, email: "not-an-email" },
    { ...good, category: "spa" },
    null,
  ]);
  assert.equal(rows.length, 1);
  assert.deepEqual(
    invalid.map((entry) => [entry.index, entry.reason]),
    [[1, "missing organization"], [2, "missing city"], [3, "invalid email"], [4, "unknown category"], [5, "missing organization"]],
  );
});

test("duplicates inside the file are counted once, case-insensitively", () => {
  const { rows, duplicatesInFile } = validateImportRows([good, { ...good, email: "INFO@martinez.com", organization: "hotel martinez" }]);
  assert.equal(rows.length, 1);
  assert.equal(duplicatesInFile, 1);
});

test("the same address at a different organisation or category is not a duplicate", () => {
  const { rows } = validateImportRows([good, { ...good, organization: "Other" }, { ...good, category: "concierge" }]);
  assert.equal(rows.length, 3);
});

test("impossible dates are dropped instead of failing the row", () => {
  const { rows } = validateImportRows([{ ...good, sourceCheckedAt: "2026-02-31" }, { ...good, organization: "B", sourceCheckedAt: "31.05.2026" }]);
  assert.equal(rows[0].sourceCheckedAt, null);
  assert.equal(rows[1].sourceCheckedAt, null);
});

test("non-array input is rejected and keys match the database identity", () => {
  assert.throws(() => validateImportRows({}), /INVALID_IMPORT/);
  assert.equal(importKey({ email: "A@x.com", organization: " Hotel ", city: "Nice", category: "hotel" }), "a@x.com|hotel|nice|hotel");
});
