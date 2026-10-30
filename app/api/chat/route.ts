import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { prepareTurn } from "@/lib/chat/agent";
import { tools } from "@/lib/chat/tools";

export const maxDuration = 30;

// Only the shape we rely on is checked; message parts are checked by convertToModelMessages.
const requestSchema = z.object({
  messages: z
    .array(
      z.looseObject({
        id: z.string(),
        role: z.enum(["user", "assistant", "system"]),
        parts: z.array(z.unknown()),
      }),
    )
    .min(1)
    .max(100),
});

export async function POST(req: Request) {
  const body = requestSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }
  // The server owns the instructions, so system messages from the browser are dropped.
  const messages = (body.data.messages as UIMessage[]).filter(
    (message) => message.role !== "system",
  );

  const { settings } = prepareTurn(messages);
  const result = streamText({
    ...settings,
    abortSignal: req.signal,
    messages: await convertToModelMessages(messages, { tools }),
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      onError: (error) => {
        console.error("chat error:", error);
        return "Sorry, the assistant is unavailable right now. Please try again.";
      },
    }),
  });
}
