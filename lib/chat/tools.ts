import { tool, zodSchema } from "ai";
import { z } from "zod";
import { findMedia, type MediaItem } from "@/lib/media/manifest";

// What the chat cards receive. `available: false` lets the card say the file is missing.
export type MediaToolResult =
  | ({ available: true } & MediaItem)
  | { available: false; message: string };

function mediaResult(kind: MediaItem["kind"]): MediaToolResult {
  const item = findMedia(kind);
  if (!item) {
    return { available: false, message: `No ${kind} is available.` };
  }
  return { available: true, ...item };
}

export const tools = {
  showBrochure: tool({
    description:
      "Show the Sea View Skydiving brochure PDF. Use when the customer asks for a brochure.",
    inputSchema: zodSchema(z.object({})),
    execute: async () => mediaResult("pdf"),
  }),
  showVideo: tool({
    description:
      "Show a video of the Sea View Skydiving experience. Use when the customer asks to see a video.",
    inputSchema: zodSchema(z.object({})),
    execute: async () => mediaResult("video"),
  }),
};
