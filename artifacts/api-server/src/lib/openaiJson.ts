/**
 * The single OpenAI "JSON mode" request used by every AI feature (articles, news, answers, proposals,
 * partner assistant). Model selection and fallback live here so they behave the same everywhere.
 *
 * Error codes (thrown as `Error.message`): OPENAI_NOT_CONFIGURED, OPENAI_<status>:<detail>,
 * OPENAI_REQUEST_FAILED:<detail>, INVALID_AI_RESPONSE.
 */
export type OpenAiJsonOptions = {
  /** Completion limit. Default 4,000. */
  maxTokens?: number;
  /** Environment variable that overrides the model. Default OPENAI_CONTENT_MODEL. */
  modelEnv?: string;
  /** Model used when the variable is unset or unusable. Default gpt-4o. */
  defaultModel?: string;
  /** Per-request timeout. Default 75 s. */
  timeoutMs?: number;
};

const FALLBACK_MODELS = ["gpt-4o", "gpt-4o-mini"];

/** gpt-5 models are not used by these routes (different parameters); anything else configured is honoured. */
function isUsableModel(value: string | undefined): value is string {
  return Boolean(value) && !value!.startsWith("gpt-5") && !value!.includes("5.6");
}

/** Preferred model first, then the fallbacks, without duplicates. */
export function selectModels(options: OpenAiJsonOptions = {}, env: NodeJS.ProcessEnv = process.env): string[] {
  const configured = env[options.modelEnv || "OPENAI_CONTENT_MODEL"]?.trim().toLowerCase();
  const preferred = isUsableModel(configured) ? configured : options.defaultModel || "gpt-4o";
  return Array.from(new Set([preferred, ...FALLBACK_MODELS]));
}

export function extractJson(text: string): unknown {
  return JSON.parse(text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, ""));
}

/** `requestOpenAiJson(system, user, 6000)` still works: a number is read as `maxTokens`. */
export async function requestOpenAiJson(instructions: string, input: string, options: OpenAiJsonOptions | number = {}): Promise<unknown> {
  const settings: OpenAiJsonOptions = typeof options === "number" ? { maxTokens: options } : options;
  const baseUrl = (process.env.OPENAI_BASE_URL || process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  const apiKey = process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_NOT_CONFIGURED");
  const models = selectModels(settings);
  let response: Response | null = null;
  let detail = "";
  for (const model of models) {
    response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      signal: AbortSignal.timeout(settings.timeoutMs ?? 75_000),
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: instructions },
          { role: "user", content: input },
        ],
        max_tokens: settings.maxTokens ?? 4_000,
        response_format: { type: "json_object" },
      }),
    });
    if (response.ok) break;
    detail = (await response.text()).slice(0, 500);
    // Only an access/parameter problem justifies trying the next model; quota, auth and server errors do not.
    const mayBeModelAccessProblem = response.status === 400 || response.status === 403 || response.status === 404;
    if (!mayBeModelAccessProblem || model === models.at(-1)) throw new Error(`OPENAI_${response.status}:${detail}`);
  }
  if (!response?.ok) throw new Error(`OPENAI_REQUEST_FAILED:${detail}`);
  const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const outputText = data.choices?.[0]?.message?.content;
  if (!outputText) throw new Error("INVALID_AI_RESPONSE");
  return extractJson(outputText);
}
