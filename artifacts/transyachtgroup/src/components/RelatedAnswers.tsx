import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";

import { useLanguage, type LangCode } from "@/contexts/LanguageContext";
import { RELATED_QUESTIONS } from "@/data/pageLabels";
import { fetchAnswers, type Answer } from "@/lib/api";

// One shared request per language and page load; answers are small and the same for every caller.
const cached = new Map<string, Promise<Answer[]>>();
function loadAnswers(lang: string): Promise<Answer[]> {
  let request = cached.get(lang);
  if (!request) {
    request = fetchAnswers(lang).catch(() => {
      cached.delete(lang);
      return [] as Answer[];
    });
    cached.set(lang, request);
  }
  return request;
}

/** Published answers in the current language; an answer without a translation comes back in English. */
export function useAnswers(): Answer[] {
  const { lang } = useLanguage();
  const [answers, setAnswers] = useState<Answer[]>([]);
  useEffect(() => {
    let active = true;
    loadAnswers(lang).then((items) => {
      if (active) setAnswers(Array.isArray(items) ? items : []);
    });
    return () => {
      active = false;
    };
  }, [lang]);
  return answers;
}

/** Additive link block: renders nothing until at least one matching answer exists. */
export function RelatedAnswers({ answers, lang, className = "mt-14" }: { answers: Answer[]; lang: LangCode; className?: string }) {
  const { lp } = useLanguage();
  if (!answers.length) return null;
  return (
    <section className={className}>
      <h2 className="mb-5 font-serif text-2xl sm:text-3xl">{RELATED_QUESTIONS[lang] || RELATED_QUESTIONS.en}</h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {answers.map((answer) => (
          <li key={answer.slug}>
            <a
              // translated answers keep the language prefix; the others fall back to the English page
              href={answer.language === lang ? lp(`/answers/${answer.slug}/`) : `/answers/${answer.slug}/`}
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
