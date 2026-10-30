import type {
  LanguageModelV4CallOptions,
  LanguageModelV4Content,
  LanguageModelV4StreamPart,
} from "@ai-sdk/provider";
import { MockLanguageModelV4, simulateReadableStream } from "ai/test";
import type { Selection } from "@/lib/knowledge/select";

// A fake model for testing without a Gemini key or quota.
// It follows fixed rules so the same question always gets the same answer.
// Every reply starts with this label, so mock answers can't pass as real ones.
export const MOCK_LABEL = "(Demo: mock model)";

function latestUserText(options: LanguageModelV4CallOptions): string {
  const lastUser = options.prompt.findLast((message) => message.role === "user");
  if (!lastUser || lastUser.role !== "user") return "";
  return lastUser.content
    .map((part) => (part.type === "text" ? part.text : ""))
    .join(" ");
}

function respond(
  options: LanguageModelV4CallOptions,
  selection: Selection,
): LanguageModelV4Content[] {
  // Second step: the tools have run, so just add the short closing sentence.
  if (options.prompt.at(-1)?.role === "tool") {
    return [{ type: "text", text: `${MOCK_LABEL} Here you go.` }];
  }

  const question = latestUserText(options);
  const toolCalls: LanguageModelV4Content[] = [];
  if (/brochure|pdf/i.test(question)) {
    toolCalls.push({ type: "tool-call", toolCallId: "mock-brochure", toolName: "showBrochure", input: "{}" });
  }
  if (/video|film|clip/i.test(question)) {
    toolCalls.push({ type: "tool-call", toolCallId: "mock-video", toolName: "showVideo", input: "{}" });
  }
  if (toolCalls.length > 0) return toolCalls;

  if (selection.usedFallback) {
    return [
      {
        type: "text",
        text: `${MOCK_LABEL} I couldn't find that in the website information.`,
      },
    ];
  }

  // Quote the best-matching section word for word, with its link.
  const best = selection.sections[0];
  return [
    {
      type: "text",
      text: `${MOCK_LABEL} From "${best.heading}":\n\n${best.text}\n\n[Source: ${best.heading}](${best.link})`,
    },
  ];
}

const usage = {
  inputTokens: { total: 0, noCache: 0, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 0, text: 0, reasoning: 0 },
};

function finishReason(content: LanguageModelV4Content[]) {
  const usedTools = content.some((part) => part.type === "tool-call");
  return { unified: usedTools ? "tool-calls" : "stop", raw: undefined } as const;
}

function toStreamParts(content: LanguageModelV4Content[]): LanguageModelV4StreamPart[] {
  const parts: LanguageModelV4StreamPart[] = [{ type: "stream-start", warnings: [] }];
  for (const part of content) {
    if (part.type === "text") {
      parts.push(
        { type: "text-start", id: "mock-text" },
        { type: "text-delta", id: "mock-text", delta: part.text },
        { type: "text-end", id: "mock-text" },
      );
    } else if (part.type === "tool-call") {
      parts.push(part);
    }
  }
  parts.push({ type: "finish", usage, finishReason: finishReason(content) });
  return parts;
}

export function mockModel(selection: Selection) {
  return new MockLanguageModelV4({
    provider: "mock",
    modelId: "mock-model",
    doGenerate: async (options) => {
      const content = respond(options, selection);
      return { content, finishReason: finishReason(content), usage, warnings: [] };
    },
    doStream: async (options) => ({
      stream: simulateReadableStream({
        chunks: toStreamParts(respond(options, selection)),
        chunkDelayInMs: 20,
      }),
    }),
  });
}
