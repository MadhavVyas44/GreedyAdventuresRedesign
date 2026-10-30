"use client";

import { makeAssistantToolUI } from "@assistant-ui/react";
import {
  DownloadIcon,
  ExternalLinkIcon,
  FileTextIcon,
  Loader2Icon,
} from "lucide-react";
import type { MediaToolResult } from "@/lib/chat/tools";

export const BrochureToolUI = makeAssistantToolUI<
  Record<string, never>,
  MediaToolResult
>({
  toolName: "showBrochure",
  render: ({ result, status }) => {
    if (status.type === "running" || !result) {
      return (
        <div
          role="status"
          className="my-2 flex items-center gap-2 text-muted-foreground text-sm"
        >
          <Loader2Icon className="size-4 animate-spin" />
          Fetching brochure…
        </div>
      );
    }

    if (!result.available) {
      return (
        <p className="my-2 text-muted-foreground text-sm">{result.message}</p>
      );
    }

    return (
      <div className="my-2 flex max-w-sm items-center gap-3 rounded-lg border bg-card p-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted">
          <FileTextIcon className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-sm">{result.title}</p>
          <p className="text-muted-foreground text-xs">PDF</p>
        </div>
        <a
          href={result.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open ${result.title} in a new tab`}
          className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
        >
          <ExternalLinkIcon className="size-4" />
        </a>
        <a
          href={result.url}
          download
          aria-label={`Download ${result.title}`}
          className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
        >
          <DownloadIcon className="size-4" />
        </a>
      </div>
    );
  },
});
