import { google } from "@ai-sdk/google";
import { generateText, stepCountIs, type UIMessage } from "ai";
import { selectSections, type SelectedSection } from "@/lib/knowledge/select";
import { mockModel } from "./mock-model";
import { buildSystemPrompt, searchQuery } from "./prompt";
import { tools, type MediaToolResult } from "./tools";

// Set MOCK_MODEL=true to answer with the fixed-rule mock instead of Gemini.
export const isMockMode = process.env.MOCK_MODEL === "true";

export const modelName = isMockMode ? "mock model (demo)" : (process.env.MODEL_ID ?? "not set");

// Everything one chat turn needs, built the same way for the chat and the
// knowledge view, so the knowledge view shows exactly what the chat sends.
export function prepareTurn(messages: UIMessage[]) {
  const selection = selectSections(searchQuery(messages));
  const instructions = buildSystemPrompt(selection);

  return {
    selection,
    settings: {
      model: isMockMode ? mockModel(selection) : google(process.env.MODEL_ID!),
      instructions,
      tools,
      maxRetries: 1,
      stopWhen: stepCountIs(5),
    },
  };
}

// What the knowledge view shows for a test question.
export type TestTurnResult = {
  modelName: string;
  query: string;
  usedFallback: boolean;
  sections: SelectedSection[];
  instructions: string;
  media: { tool: string; result: MediaToolResult }[];
  answer: string | null;
  error: string | null;
};

// Runs one real turn (same selection, instructions, model and tools as the chat)
// and reports what was sent and what came back. Nothing is stored.
export async function runTestTurn(question: string): Promise<TestTurnResult> {
  const messages: UIMessage[] = [
    { id: "test", role: "user", parts: [{ type: "text", text: question }] },
  ];
  const { selection, settings } = prepareTurn(messages);
  const report = {
    modelName,
    query: selection.query,
    usedFallback: selection.usedFallback,
    sections: selection.sections,
    instructions: settings.instructions,
  };

  try {
    const result = await generateText({
      ...settings,
      messages: [{ role: "user", content: question }],
    });
    const media = result.steps.flatMap((step) =>
      step.toolResults.map((toolResult) => ({
        tool: toolResult.toolName,
        result: toolResult.output as MediaToolResult,
      })),
    );
    return { ...report, media, answer: result.text, error: null };
  } catch (error) {
    console.error("knowledge test error:", error);
    return {
      ...report,
      media: [],
      answer: null,
      error:
        "The model call failed (for example: quota used up or network error). The text that would have been sent is still shown.",
    };
  }
}
