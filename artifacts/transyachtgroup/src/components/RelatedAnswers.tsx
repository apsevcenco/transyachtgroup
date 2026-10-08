import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";

import type { LangCode } from "@/contexts/LanguageContext";
import { fetchAnswers, type Answer } from "@/lib/api";

// One shared request per page load; answers are small and the same for every caller.
let cached: Promise<Answer[]> | null = null;
function loadAnswers(): Promise<Answer[]> {
  if (!cached) {
    cached = fetchAnswers().catch(() => {
      cached = null;
      return [] as Answer[];
    });
  }
  return cached;
}

export function useAnswers(): Answer[] {
  const [answers, setAnswers] = useState<Answer[]>([]);
  useEffect(() => {
    let active = true;
    loadAnswers().then((items) => {
      if (active) setAnswers(Array.isArray(items) ? items : []);
    });
    return () => {
      active = false;
    };
  }, []);
  return answers;
}

const HEADING: Record<LangCode, string> = {
  en: "Related questions",
  fr: "Questions associées",
  ru: "Связанные вопросы",
  ro: "Întrebări conexe",
  ar: "أسئلة ذات صلة",
};

/** Additive link block: renders nothing until at least one matching answer exists. */
export function RelatedAnswers({ answers, lang, className = "mt-14" }: { answers: Answer[]; lang: LangCode; className?: string }) {
  if (!answers.length) return null;
  return (
    <section className={className}>
      <h2 className="mb-5 font-serif text-2xl sm:text-3xl">{HEADING[lang] || HEADING.en}</h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {answers.map((answer) => (
          <li key={answer.slug}>
            <a
              href={`/answers/${answer.slug}/`}
              className="flex min-h-16 items-center justify-between gap-4 rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-white/65 transition hover:border-gold/40 hover:text-gold"
            >
              <span>{answer.question}</span>
              <ChevronRight size={16} className="shrink-0" />
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
