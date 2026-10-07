import test from "node:test";
import assert from "node:assert/strict";
import {
  classifyDeliveryEvent,
  extractEmailAddress,
  followUpAfterSend,
  htmlToText,
  retryDelayMs,
  shouldUpdateMessageStatus,
  statusAfterReply,
} from "./partnerMailUtils.ts";

test("retry delay honours Retry-After, backs off without it, and is bounded", () => {
  assert.equal(retryDelayMs("2", 0), 2_000);
  assert.equal(retryDelayMs(null, 0), 1_000);
  assert.equal(retryDelayMs(undefined, 2), 4_000);
  assert.equal(retryDelayMs("not-a-number", 1), 2_000);
  assert.equal(retryDelayMs("120", 0), 10_000);
  assert.equal(retryDelayMs("0.1", 0), 500);
});

test("extracts the address from a display-name header", () => {
  assert.equal(extractEmailAddress("Jane Doe <Jane@Hotel.com>"), "jane@hotel.com");
  assert.equal(extractEmailAddress("  concierge@riviera.fr "), "concierge@riviera.fr");
  assert.equal(extractEmailAddress("not an email"), null);
  assert.equal(extractEmailAddress(undefined), null);
});

test("html replies are reduced to readable text", () => {
  const text = htmlToText("<p>Hello&nbsp;team</p><p>Yes &amp; thanks<br/>Anna</p><style>p{color:red}</style>");
  assert.equal(text, "Hello team\nYes & thanks\nAnna");
});

test("only permanent bounces and complaints block a contact", () => {
  assert.equal(classifyDeliveryEvent("email.bounced", { bounce: { type: "Permanent", message: "No such user" } })?.blockContact, true);
  assert.equal(classifyDeliveryEvent("email.bounced", { bounce: { type: "Transient" } })?.blockContact, false);
  assert.equal(classifyDeliveryEvent("email.bounced", {})?.blockContact, false);
  assert.equal(classifyDeliveryEvent("email.complained", {})?.blockContact, true);
  assert.equal(classifyDeliveryEvent("email.delivered", {})?.messageStatus, "delivered");
  assert.equal(classifyDeliveryEvent("email.opened", {}), null);
});

test("a late delivered event never overwrites a bounce", () => {
  assert.equal(shouldUpdateMessageStatus("bounced", "delivered"), false);
  assert.equal(shouldUpdateMessageStatus("sent", "delivered"), true);
  assert.equal(shouldUpdateMessageStatus("delivered", "bounced"), true);
});

test("sending moves a new contact to proposal_sent and schedules a follow-up", () => {
  const now = new Date("2026-10-07T10:00:00Z");
  const result = followUpAfterSend({ status: "new", nextFollowUpAt: null }, now);
  assert.equal(result.status, "proposal_sent");
  assert.equal(result.nextFollowUpAt?.toISOString(), "2026-10-14T10:00:00.000Z");
});

test("sending keeps an advanced status and a pending future follow-up", () => {
  const now = new Date("2026-10-07T10:00:00Z");
  const future = new Date("2026-10-20T10:00:00Z");
  const result = followUpAfterSend({ status: "interested", nextFollowUpAt: future }, now);
  assert.equal(result.status, "interested");
  assert.equal(result.nextFollowUpAt, future);
});

test("sending refreshes an overdue follow-up but never schedules one for a closed contact", () => {
  const now = new Date("2026-10-07T10:00:00Z");
  const overdue = new Date("2026-10-01T10:00:00Z");
  assert.equal(followUpAfterSend({ status: "replied", nextFollowUpAt: overdue }, now).nextFollowUpAt?.toISOString(), "2026-10-14T10:00:00.000Z");
  assert.equal(followUpAfterSend({ status: "partner", nextFollowUpAt: null }, now).nextFollowUpAt, null);
});

test("a reply only changes the early-funnel statuses", () => {
  assert.equal(statusAfterReply("proposal_sent"), "replied");
  assert.equal(statusAfterReply("new"), "replied");
  assert.equal(statusAfterReply("interested"), "interested");
  assert.equal(statusAfterReply("do_not_contact"), "do_not_contact");
});
