/**
 * Turns a failed provider response (WhatsApp Cloud API, Resend, ...) into a short, safe message that explains
 * WHY it failed, e.g. "WhatsApp provider rejected the request (400): Template name does not exist in the translation".
 * Secrets are stripped and the text is capped, so it can be stored and shown in the admin.
 */
export function summarizeProviderBody(status: number, provider: string, body: string): string {
  let detail = "";
  try {
    const json = JSON.parse(body) as Record<string, any>;
    const error = (json && typeof json === "object" && json.error && typeof json.error === "object" ? json.error : json) as Record<string, any>;
    detail = [
      typeof error.message === "string" ? error.message : "",
      typeof error.error_data?.details === "string" ? error.error_data.details : "",
      typeof error.error_user_msg === "string" ? error.error_user_msg : "",
      error.code !== undefined && typeof error.message === "string" ? `code ${error.code}` : "",
    ]
      .filter(Boolean)
      .join(" · ");
  } catch {
    detail = body;
  }
  const clean = detail
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer ***")
    .replace(/\b(?:EAA|re_)[A-Za-z0-9_-]{12,}\b/g, "***")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 300);
  return `${provider} rejected the request (${status})${clean ? `: ${clean}` : ""}`;
}

export async function describeProviderFailure(response: Response, provider: string): Promise<string> {
  let body = "";
  try {
    body = await response.text();
  } catch {
    // keep the status-only message
  }
  return summarizeProviderBody(response.status, provider, body);
}
