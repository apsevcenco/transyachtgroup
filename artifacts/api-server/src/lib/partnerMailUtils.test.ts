import test from "node:test";
import assert from "node:assert/strict";
import {
  appendHtmlFooter,
  detectOptOut,
  listUnsubscribeHeaders,
  optOutFooterText,
  classifyDeliveryEvent,
  cleanAssistantResult,
  digestHourFromEnv,
  parisClock,
  plainTextToEmailHtml,
  shouldSendDigest,
  extractEmailAddress,
  followUpAfterSend,
  htmlToText,
  retryDelayMs,
  shouldUpdateMessageStatus,
  statusAfterReply,
} from "./partnerMailUtils.ts";

test("only an unmistakable opt-out blocks a contact", () => {
  // the subject our List-Unsubscribe mailto produces, with and without reply prefixes
  assert.equal(detectOptOut("unsubscribe", ""), true);
  assert.equal(detectOptOut("Re: Unsubscribe", null), true);
  // short first lines, in the languages of our footer
  assert.equal(detectOptOut("Re: Partnership", "Unsubscribe\n\nOn Tue, Trans Yacht Group wrote:\n> hello"), true);
  assert.equal(detectOptOut("Re: Partnership", "STOP."), true);
  assert.equal(detectOptOut("Re: Partnership", "Désinscription svp"), true);
  assert.equal(detectOptOut("Re: Partnership", "> quoted\nPlease unsubscribe us"), true);
  assert.equal(detectOptOut("Re: Partnership", "Отпишите нас, пожалуйста"), true);
  // ambiguous or conversational replies are left to a human
  assert.equal(detectOptOut("Re: Partnership", "Thanks, we'd like to learn more. Can you send rates?"), false);
  assert.equal(detectOptOut("Re: Partnership", "Please stop by our office next week"), false);
  assert.equal(detectOptOut("Re: Partnership", "We do not want to unsubscribe, rather the opposite, send details"), false);
  assert.equal(detectOptOut("Re: Luxury Mobility Partnership for Hotels", "Interested!"), false);
  assert.equal(detectOptOut(null, null), false);
});

test("the opt-out footer goes inside <body> and the unsubscribe header points at the reply address", () => {
  assert.equal(appendHtmlFooter("<p>Hi</p>", "<i>F</i>"), "<p>Hi</p><i>F</i>");
  assert.equal(appendHtmlFooter("<html><body><p>Hi</p></body></html>", "<i>F</i>"), "<html><body><p>Hi</p><i>F</i></body></html>");
  assert.deepEqual(listUnsubscribeHeaders("Trans Yacht <reply@x.resend.app>"), { "List-Unsubscribe": "<mailto:reply@x.resend.app?subject=unsubscribe>" });
  assert.equal(listUnsubscribeHeaders(undefined), undefined);
  assert.ok(optOutFooterText.includes("unsubscribe") && optOutFooterText.includes("désinscription"));
});

test("digest timing uses Paris time, summer and winter, and sends once per day", () => {
  assert.deepEqual(parisClock(new Date("2026-10-07T06:30:00Z")), { date: "2026-10-07", hour: 8 });
  assert.deepEqual(parisClock(new Date("2026-12-01T06:30:00Z")), { date: "2026-12-01", hour: 7 });
  assert.deepEqual(parisClock(new Date("2026-10-07T22:30:00Z")), { date: "2026-10-08", hour: 0 });

  assert.equal(shouldSendDigest(new Date("2026-10-07T05:59:00Z"), null, 8), false, "07:59 in Paris is too early");
  assert.equal(shouldSendDigest(new Date("2026-10-07T06:00:00Z"), null, 8), true);
  assert.equal(shouldSendDigest(new Date("2026-10-07T15:00:00Z"), "2026-10-07", 8), false, "already sent today");
  assert.equal(shouldSendDigest(new Date("2026-10-08T06:10:00Z"), "2026-10-07", 8), true, "new day");
});

test("digest hour falls back to 8 for anything unusable", () => {
  assert.equal(digestHourFromEnv(undefined), 8);
  assert.equal(digestHourFromEnv(""), 8);
  assert.equal(digestHourFromEnv("abc"), 8);
  assert.equal(digestHourFromEnv("24"), 8);
  assert.equal(digestHourFromEnv("0"), 0);
  assert.equal(digestHourFromEnv("17"), 17);
});

test("assistant output is validated, not trusted", () => {
  const fallback = { subject: "Re: Partnership", status: "replied" };
  const ok = cleanAssistantResult(
    { intent: "interested", summary: "Хотят условия", suggestedStatus: "interested", subject: "Subject: Re: Hello", body: "  Dear team, ...  ", language: "fr" },
    fallback,
  );
  assert.equal(ok.intent, "interested");
  assert.equal(ok.suggestedStatus, "interested");
  assert.equal(ok.subject, "Re: Hello");
  assert.equal(ok.body, "Dear team, ...");

  const odd = cleanAssistantResult({ intent: "banana", suggestedStatus: "vip", body: "Hi" }, fallback);
  assert.equal(odd.intent, "other");
  assert.equal(odd.suggestedStatus, "replied");
  assert.equal(odd.subject, "Re: Partnership");
  assert.equal(odd.language, "en");

  assert.throws(() => cleanAssistantResult({ intent: "other", body: "   " }, fallback), /INVALID_AI_RESPONSE/);
  assert.throws(() => cleanAssistantResult("not json", fallback), /INVALID_AI_RESPONSE/);
});

test("plain text becomes escaped html with line breaks", () => {
  const html = plainTextToEmailHtml("Hello <b>team</b>\nBest & regards");
  assert.ok(html.includes("Hello &lt;b&gt;team&lt;/b&gt;<br/>Best &amp; regards"));
  assert.ok(!html.includes("<b>"));
});

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
