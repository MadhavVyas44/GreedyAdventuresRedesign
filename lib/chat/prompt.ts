import type { UIMessage } from "ai";
import type { Selection } from "@/lib/knowledge/select";
import { sources } from "@/lib/knowledge/sources";

// The text we search the knowledge with: the latest customer message plus the
// one before it, so short follow-ups ("and the VIP one?") keep their context.
export function searchQuery(messages: UIMessage[]): string {
  return messages
    .filter((message) => message.role === "user")
    .slice(-2)
    .map((message) =>
      message.parts
        .map((part) => (part.type === "text" ? part.text : ""))
        .join(" "),
    )
    .join("\n");
}

export function buildSystemPrompt(selection: Selection): string {
  const capturedAt = sources.map((source) => source.capturedAt).join(", ");
  const sourceText = selection.sections
    .map((section) => `## ${section.heading}\nLink: ${section.link}\n${section.text}`)
    .join("\n\n");

  return `You are the Greedy Adventures assistant for Sea View Skydiving in Pattaya.
Answer only from the website information below. If the answer isn't there, say so plainly. Never guess prices, times or policies.
End factual answers with a markdown link to the section you used, taken from its "Link" line, for example: [Source: The details](https://...). Don't write the word "Link:".
When the customer asks for a brochure, call showBrochure. When they ask for a video, call showVideo. If they ask for both, call both.
After showing a brochure or video, reply with one short sentence. Don't repeat its link or add a source link, because the card already shows it.
If a tool says the file is not available, tell the customer plainly.

# Website information (captured ${capturedAt})
${sourceText}`;
}
