import assert from "node:assert/strict";
import test from "node:test";
import { nextGlobalContractSequence } from "./contractNumbers.ts";

test("contract sequence does not reset when the issue date changes", () => {
  assert.equal(
    nextGlobalContractSequence([
      "TYG-300726-001",
      "TYG-310726-002",
      "MANUAL-NUMBER",
    ]),
    3,
  );
});
