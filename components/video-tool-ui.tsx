"use client";

import { useState } from "react";
import { makeAssistantToolUI } from "@assistant-ui/react";
import { ExternalLinkIcon, Loader2Icon } from "lucide-react";
import type { MediaToolResult } from "@/lib/chat/tools";

type Video = Extract<MediaToolResult, { available: true }>;

function VideoCard({ video }: { video: Video }) {
  // If the video can't play (blocked, offline), fall back to a plain link.
  const [failed, setFailed] = useState(false);

  return (
    <figure className="my-2 max-w-md overflow-hidden rounded-lg border bg-card">
      {failed ? (
        <p className="p-3 text-muted-foreground text-sm">
          The video couldn&apos;t load here. Use the link below to watch it.
        </p>
      ) : (
        <video
          src={video.url}
          poster={video.poster}
          controls
          // The film is ~12 MB: load nothing until play, then it streams.
          preload="none"
          playsInline
          aria-label={video.title}
          onError={() => setFailed(true)}
          className="aspect-video w-full bg-black"
        />
      )}
      <figcaption className="flex items-center justify-between gap-2 p-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-sm">{video.title}</p>
          <p className="text-muted-foreground text-xs">
            {video.origin === "website"
              ? "Video from the Greedy Adventures website"
              : "Demo video"}
          </p>
        </div>
        <a
          href={video.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-muted-foreground text-xs hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
        >
          Open video
          <ExternalLinkIcon className="size-3.5" />
        </a>
      </figcaption>
    </figure>
  );
}

export const VideoToolUI = makeAssistantToolUI<
  Record<string, never>,
  MediaToolResult
>({
  toolName: "showVideo",
  render: ({ result, status }) => {
    if (status.type === "running" || !result) {
      return (
        <div
          role="status"
          className="my-2 flex items-center gap-2 text-muted-foreground text-sm"
        >
          <Loader2Icon className="size-4 animate-spin" />
          Fetching video…
        </div>
      );
    }

    if (!result.available) {
      return (
        <p className="my-2 text-muted-foreground text-sm">{result.message}</p>
      );
    }

    return <VideoCard video={result} />;
  },
});
