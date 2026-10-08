/**
 * Which published answers to cross-link from service, location and answer pages.
 * Pure module (no imports) so the React pages and the build-time prerender share one rule set.
 */
export type AnswerLike = {
  slug: string;
  question: string;
  relatedServicePath?: string | null;
  primaryKeyword?: string | null;
};

const withSlash = (value?: string | null) => (value || "").replace(/\/?$/, "/");
const mentions = (answer: AnswerLike, word: string) =>
  `${answer.question} ${answer.primaryKeyword || ""} ${answer.slug}`.toLowerCase().includes(word);

/** Answers that belong to one service page: its own first, then same-area ones (Courchevel cluster). */
export function answersForService<T extends AnswerLike>(answers: T[], serviceSlug: string, area?: string, limit = 5): T[] {
  const own = answers.filter((answer) => withSlash(answer.relatedServicePath) === `/services/${serviceSlug}/`);
  const sameArea = area
    ? answers.filter((answer) => !own.includes(answer) && mentions(answer, area.toLowerCase()))
    : [];
  return [...own, ...sameArea].slice(0, limit);
}

/** Answers for a location page: those tied to one of its services, or that name the city. */
export function answersForLocation<T extends AnswerLike>(answers: T[], cityName: string, serviceSlugs: string[], limit = 5): T[] {
  const paths = new Set(serviceSlugs.map((slug) => `/services/${slug}/`));
  const own = answers.filter((answer) => paths.has(withSlash(answer.relatedServicePath)));
  const named = answers.filter((answer) => !own.includes(answer) && mentions(answer, cityName.toLowerCase()));
  return [...own, ...named].slice(0, limit);
}

/** Other answers worth reading next: same service first, then same destination, then the rest. */
export function moreAnswers<T extends AnswerLike>(answers: T[], current: AnswerLike, limit = 4): T[] {
  const area = mentions(current, "courchevel") ? "courchevel" : "";
  const score = (answer: T) =>
    (withSlash(answer.relatedServicePath) === withSlash(current.relatedServicePath) ? 3 : 0) + (area && mentions(answer, area) ? 2 : 0);
  return answers
    .filter((answer) => answer.slug !== current.slug)
    .map((answer, index) => ({ answer, index, value: score(answer) }))
    .sort((a, b) => b.value - a.value || a.index - b.index)
    .slice(0, limit)
    .map((entry) => entry.answer);
}
