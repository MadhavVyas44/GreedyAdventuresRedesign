import { sources } from "./sources";

// A section chosen for a question, with where it came from.
export type SelectedSection = {
  sourceTitle: string;
  heading: string;
  link: string;
  text: string;
  score: number;
};

export type Selection = {
  query: string;
  sections: SelectedSection[];
  // True when nothing matched and the overview sections were sent instead.
  usedFallback: boolean;
};

const MAX_SECTIONS = 5;
const MIN_SHARE_OF_BEST = 0.25;

// The ECO / DELUXE / VIP cards share this anchor. They only make sense
// side by side, so if one is chosen all three are sent.
const PACKAGE_ANCHOR = "options";

// Sent when the question matches nothing, e.g. "hi" or "tell me about it".
const FALLBACK_HEADINGS = ["Sea View Tandem Skydive - Pattaya", "Highlights"];

const STOP_WORDS = new Set(
  "a an and are as at be can do does for from have how i in is it me my of on or our so that the this to was what when where which who why will with you your about there their them they any get".split(
    " ",
  ),
);

// Everyday words customers use that the page says differently.
// Small on purpose: keyword matching can't know every phrasing (see README limitations).
const SYNONYMS: Record<string, string[]> = {
  high: ["altitude"],
  height: ["altitude"],
  long: ["minutes", "seconds", "hours"],
  bring: ["photo"],
  film: ["video"],
};

// Lowercase words, minus common filler words, cut to 5 letters so
// "arrive" and "arrival" (or "include" and "included") count as the same word.
function stems(text: string): Set<string> {
  const words = text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  return new Set(
    words
      .flatMap((word) => [word, ...(SYNONYMS[word] ?? [])])
      .filter((word) => word.length > 2 && !STOP_WORDS.has(word))
      .map((word) => word.slice(0, 5)),
  );
}

// Every section once, with its words prepared for matching.
const allSections = sources.flatMap((source) =>
  source.sections.map((section) => ({
    sourceTitle: source.title,
    heading: section.heading,
    link: section.anchor ? `${source.url}#${section.anchor}` : source.url,
    text: section.text,
    isPackage: section.anchor === PACKAGE_ANCHOR,
    stems: stems(`${section.heading} ${section.text}`),
    headingStems: stems(section.heading),
  })),
);

// How many sections each word appears in. A word in one section ("altitude")
// is a strong clue; a word in most sections ("jump") barely counts.
const sectionCount = new Map<string, number>();
for (const section of allSections) {
  for (const stem of section.stems) {
    sectionCount.set(stem, (sectionCount.get(stem) ?? 0) + 1);
  }
}

export function selectSections(query: string): Selection {
  const queryStems = stems(query);

  const scored = allSections.map((section) => {
    let score = 0;
    for (const stem of queryStems) {
      if (!section.stems.has(stem)) continue;
      const weight = 1 / sectionCount.get(stem)!;
      // A match in the heading is a stronger signal than one in the body.
      score += section.headingStems.has(stem) ? weight * 2 : weight;
    }
    return { section, score: Math.round(score * 100) / 100 };
  });

  // Drop weak matches: anything under a quarter of the best section's score.
  const bestScore = Math.max(...scored.map(({ score }) => score));
  let chosen = scored
    .filter(({ score }) => score > 0 && score >= bestScore * MIN_SHARE_OF_BEST)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_SECTIONS);

  if (chosen.some(({ section }) => section.isPackage)) {
    const missingPackages = scored.filter(
      (item) => item.section.isPackage && !chosen.includes(item),
    );
    chosen = [...chosen, ...missingPackages];
  }

  const usedFallback = chosen.length === 0;
  if (usedFallback) {
    chosen = scored.filter(({ section }) =>
      FALLBACK_HEADINGS.includes(section.heading),
    );
  }

  return {
    query,
    sections: chosen.map(({ section, score }) => ({
      sourceTitle: section.sourceTitle,
      heading: section.heading,
      link: section.link,
      text: section.text,
      score,
    })),
    usedFallback,
  };
}
