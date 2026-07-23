import { Router, type IRouter } from "express";
import { adminAuth } from "../middleware/auth";

const SUPPORTED_LANGS: Record<string, string> = {
  en: "English",
  fr: "French",
  ru: "Russian",
  ro: "Romanian",
  ar: "Arabic",
};

const router: IRouter = Router();

function extractTextSegments(html: string): { segments: string[]; template: string } {
  const segments: string[] = [];
  let idx = 0;

  const template = html.replace(/>([^<]+)</g, (match, textContent) => {
    const trimmed = (textContent as string).trim();
    if (!trimmed) return match;
    segments.push(textContent as string);
    const placeholder = `>__TXSEG_${idx}__<`;
    idx++;
    return placeholder;
  });

  return { segments, template };
}

function reassembleHtml(template: string, translatedSegments: string[]): string {
  let result = template;
  for (let i = 0; i < translatedSegments.length; i++) {
    result = result.replace(`>__TXSEG_${i}__<`, `>${translatedSegments[i]}<`);
  }
  return result;
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*<p[^>]*>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function isHtml(text: string): boolean {
  return /<[a-z][\s\S]*>/i.test(text);
}

async function translateWithGoogleFree(text: string, sourceLang: string, targetLang: string): Promise<string> {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;

  const resp = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0",
    },
  });

  if (!resp.ok) {
    throw new Error(`Google Translate error: ${resp.status}`);
  }

  const data = await resp.json() as any;
  if (!Array.isArray(data) || !Array.isArray(data[0])) {
    throw new Error("Unexpected response format");
  }

  return data[0]
    .filter((segment: any) => segment && segment[0])
    .map((segment: any) => segment[0])
    .join("");
}

async function translateSegmentsGoogle(segments: string[], sourceLang: string, targetLang: string): Promise<string[]> {
  const results: string[] = [];
  for (const seg of segments) {
    const plain = seg.trim();
    if (!plain) {
      results.push(seg);
      continue;
    }
    const translated = await translateWithGoogleFree(plain, sourceLang, targetLang);
    results.push(translated);
  }
  return results;
}

async function translateWithAI(text: string, sourceLang: string, targetLangs: string[]): Promise<Record<string, string>> {
  const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
  const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;

  if (!baseURL || !apiKey) {
    throw new Error("AI env vars not set");
  }

  const langList = targetLangs
    .map((l: string) => `${l} (${SUPPORTED_LANGS[l]})`)
    .join(", ");

  const prompt = `Translate the following text from ${SUPPORTED_LANGS[sourceLang]} to these languages: ${langList}.

IMPORTANT RULES:
- Return ONLY the translated plain text. 
- Do NOT wrap the result in any HTML tags.
- Preserve line breaks as plain newline characters only.

Return ONLY a valid JSON object with language codes as keys and translated text as values. No explanation, no markdown, just the JSON.

Example format:
{"fr": "translated text", "ru": "translated text"}

Text to translate:
${text}`;

  const resp = await fetch(`${baseURL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a professional translator. Return only valid JSON with plain text translations." },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
    }),
  });

  if (!resp.ok) {
    throw new Error(`AI API ${resp.status}`);
  }

  const data = await resp.json() as any;
  const responseText = data.choices?.[0]?.message?.content?.trim() || "{}";

  let cleaned = responseText;
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  const raw = JSON.parse(cleaned);
  const result: Record<string, string> = {};
  for (const [langCode, value] of Object.entries(raw)) {
    if (typeof value === "string") {
      result[langCode] = stripHtml(value);
    }
  }
  return result;
}

async function translateHtmlPreservingStructure(
  html: string,
  sourceLang: string,
  targetLang: string
): Promise<string> {
  const { segments, template } = extractTextSegments(html);

  if (segments.length === 0) {
    return html;
  }

  const translatedSegments = await translateSegmentsGoogle(segments, sourceLang, targetLang);
  return reassembleHtml(template, translatedSegments);
}

async function translateTextForLang(
  text: string,
  sourceLang: string,
  targetLang: string,
  htmlInput: boolean
): Promise<string> {
  if (htmlInput) {
    return translateHtmlPreservingStructure(text, sourceLang, targetLang);
  }
  return translateWithGoogleFree(text, sourceLang, targetLang);
}

router.post("/translate", adminAuth, async (req, res) => {
  try {
    const { text, sourceLang, targetLangs } = req.body;

    if (!text || !sourceLang || !targetLangs || !Array.isArray(targetLangs)) {
      res.status(400).json({ error: "text, sourceLang, and targetLangs[] are required" });
      return;
    }

    const validTargets = targetLangs.filter(
      (l: string) => l !== sourceLang && SUPPORTED_LANGS[l]
    );

    if (validTargets.length === 0) {
      res.status(400).json({ error: "No valid target languages" });
      return;
    }

    const htmlInput = isHtml(text);

    try {
      if (!htmlInput) {
        const result = await translateWithAI(stripHtml(text), sourceLang, validTargets);
        if (Object.keys(result).length > 0) {
          res.json({ translations: result });
          return;
        }
      }
    } catch (aiErr) {
      console.log("AI translation unavailable, falling back to Google Translate:", (aiErr as Error).message);
    }

    const translations: Record<string, string> = {};
    await Promise.all(
      validTargets.map(async (lang: string) => {
        try {
          translations[lang] = await translateTextForLang(text, sourceLang, lang, htmlInput);
        } catch (err) {
          console.error(`Translation failed for ${lang}:`, err);
        }
      })
    );

    if (Object.keys(translations).length === 0) {
      res.status(500).json({ error: "All translation services failed. Please try again later." });
      return;
    }

    res.json({ translations });
  } catch (err) {
    console.error("Translation error:", err);
    res.status(500).json({ error: "Translation failed" });
  }
});

export default router;
