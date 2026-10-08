import test from "node:test";
import assert from "node:assert/strict";
import { extractJson, requestOpenAiJson, selectModels } from "./openaiJson.ts";

const ENV_KEYS = ["OPENAI_API_KEY", "AI_INTEGRATIONS_OPENAI_API_KEY", "OPENAI_BASE_URL", "AI_INTEGRATIONS_OPENAI_BASE_URL", "OPENAI_CONTENT_MODEL", "OPENAI_ANSWERS_MODEL"];

/** Runs a test body with a clean OpenAI environment and a scripted fetch, restoring both afterwards. */
async function withFakeOpenAi(env: Record<string, string>, replies: Array<{ status: number; body: unknown }>, run: (calls: Array<{ url: string; init: RequestInit; payload: any }>) => Promise<void>) {
  const savedEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
  const savedFetch = globalThis.fetch;
  for (const key of ENV_KEYS) delete process.env[key];
  Object.assign(process.env, env);
  const calls: Array<{ url: string; init: RequestInit; payload: any }> = [];
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    calls.push({ url: String(url), init, payload: JSON.parse(String(init.body)) });
    const reply = replies[Math.min(calls.length - 1, replies.length - 1)];
    return new Response(typeof reply.body === "string" ? reply.body : JSON.stringify(reply.body), { status: reply.status });
  }) as typeof fetch;
  try {
    await run(calls);
  } finally {
    globalThis.fetch = savedFetch;
    for (const key of ENV_KEYS) {
      if (savedEnv[key] === undefined) delete process.env[key];
      else process.env[key] = savedEnv[key];
    }
  }
}

const ok = (content: string) => ({ status: 200, body: { choices: [{ message: { content } }] } });

test("selectModels: default chain, configured model, gpt-5 ignored, per-feature override", () => {
  assert.deepEqual(selectModels({}, {}), ["gpt-4o", "gpt-4o-mini"]);
  assert.deepEqual(selectModels({}, { OPENAI_CONTENT_MODEL: " GPT-4.1 " }), ["gpt-4.1", "gpt-4o", "gpt-4o-mini"]);
  assert.deepEqual(selectModels({}, { OPENAI_CONTENT_MODEL: "gpt-5.6-sol" }), ["gpt-4o", "gpt-4o-mini"]);
  assert.deepEqual(selectModels({}, { OPENAI_CONTENT_MODEL: "gpt-5-mini" }), ["gpt-4o", "gpt-4o-mini"]);
  assert.deepEqual(selectModels({ modelEnv: "OPENAI_ANSWERS_MODEL", defaultModel: "gpt-4.1" }, {}), ["gpt-4.1", "gpt-4o", "gpt-4o-mini"]);
  assert.deepEqual(selectModels({ modelEnv: "OPENAI_ANSWERS_MODEL", defaultModel: "gpt-4.1" }, { OPENAI_ANSWERS_MODEL: "gpt-4o" }), ["gpt-4o", "gpt-4o-mini"]);
});

test("extractJson strips code fences", () => {
  assert.deepEqual(extractJson('```json\n{"a":1}\n```'), { a: 1 });
  assert.deepEqual(extractJson('  {"a":2}  '), { a: 2 });
});

test("throws OPENAI_NOT_CONFIGURED without a key", async () => {
  await withFakeOpenAi({}, [ok("{}")], async () => {
    await assert.rejects(() => requestOpenAiJson("s", "u"), /^Error: OPENAI_NOT_CONFIGURED$/);
  });
});

test("sends the expected request and parses the JSON answer", async () => {
  await withFakeOpenAi({ OPENAI_API_KEY: "test-key", OPENAI_BASE_URL: "https://example.test/v1/" }, [ok('{"hello":"world"}')], async (calls) => {
    const result = await requestOpenAiJson("system text", "user text", 6_000);
    assert.deepEqual(result, { hello: "world" });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "https://example.test/v1/chat/completions");
    assert.equal((calls[0].init.headers as Record<string, string>).Authorization, "Bearer test-key");
    assert.deepEqual(calls[0].payload, {
      model: "gpt-4o",
      messages: [{ role: "system", content: "system text" }, { role: "user", content: "user text" }],
      max_tokens: 6_000,
      response_format: { type: "json_object" },
    });
  });
});

test("default token limit is 4000 and options object works", async () => {
  await withFakeOpenAi({ OPENAI_API_KEY: "k" }, [ok("{}")], async (calls) => {
    await requestOpenAiJson("s", "u");
    await requestOpenAiJson("s", "u", { maxTokens: 16_000, modelEnv: "OPENAI_ANSWERS_MODEL", defaultModel: "gpt-4.1" });
    assert.equal(calls[0].payload.max_tokens, 4_000);
    assert.equal(calls[1].payload.max_tokens, 16_000);
    assert.equal(calls[1].payload.model, "gpt-4.1");
  });
});

test("falls back to the next model on 400/403/404 only", async () => {
  await withFakeOpenAi({ OPENAI_API_KEY: "k", OPENAI_CONTENT_MODEL: "gpt-4.1" }, [{ status: 404, body: "model not found" }, { status: 403, body: "no access" }, ok('{"done":true}')], async (calls) => {
    assert.deepEqual(await requestOpenAiJson("s", "u"), { done: true });
    assert.deepEqual(calls.map((c) => c.payload.model), ["gpt-4.1", "gpt-4o", "gpt-4o-mini"]);
  });
  await withFakeOpenAi({ OPENAI_API_KEY: "k" }, [{ status: 429, body: "quota" }], async (calls) => {
    await assert.rejects(() => requestOpenAiJson("s", "u"), /OPENAI_429:quota/);
    assert.equal(calls.length, 1, "a quota error must not be retried on another model");
  });
});

test("reports the last model's failure and bad answers", async () => {
  await withFakeOpenAi({ OPENAI_API_KEY: "k" }, [{ status: 400, body: "bad" }], async (calls) => {
    await assert.rejects(() => requestOpenAiJson("s", "u"), /OPENAI_400:bad/);
    assert.equal(calls.length, 2);
  });
  await withFakeOpenAi({ OPENAI_API_KEY: "k" }, [ok("")], async () => {
    await assert.rejects(() => requestOpenAiJson("s", "u"), /INVALID_AI_RESPONSE/);
  });
});
