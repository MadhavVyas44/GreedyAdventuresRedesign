import type { Metadata } from "next";
import Link from "next/link";
import { TestQuestion } from "@/components/knowledge/test-question";
import { isMockMode, modelName } from "@/lib/chat/agent";
import { sources } from "@/lib/knowledge/sources";
import { media } from "@/lib/media/manifest";

// Render on each request so the model / mock-mode label matches the running server.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Knowledge view · Sea View Skydiving assistant",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  });
}

// Read-only view of everything the assistant can use. No editing, no chat history.
export default function KnowledgePage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
      <Link
        href="/"
        className="text-muted-foreground text-sm underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
      >
        ← Back to the assistant
      </Link>
      <h1 className="mt-4 font-semibold text-2xl sm:text-3xl">Knowledge view</h1>
      <p className="mt-2 text-muted-foreground">
        Read-only. This is everything the assistant is allowed to answer from.
        Model: <span className="font-medium text-foreground">{modelName}</span>
        {isMockMode && " (mock mode: answers follow fixed rules, labelled demo)"}
      </p>

      <section aria-labelledby="test-heading" className="mt-10">
        <h2 id="test-heading" className="font-semibold text-xl">
          Test a question
        </h2>
        <p className="mt-1 text-muted-foreground text-sm">
          Runs a real turn on the server, the same way the chat does, and shows
          the exact text sent to the model and any media it chose. Nothing is
          saved.
        </p>
        <TestQuestion />
      </section>

      <section aria-labelledby="media-heading" className="mt-12">
        <h2 id="media-heading" className="font-semibold text-xl">
          Media the assistant can show
        </h2>
        <ul className="mt-4 divide-y rounded-lg border">
          {media.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 p-4">
              <span className="rounded bg-muted px-2 py-0.5 font-medium text-xs uppercase">
                {item.kind}
              </span>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
              >
                {item.title}
              </a>
              <span className="text-muted-foreground text-sm">
                {item.origin === "website" ? "From the website" : "Demo file"}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="sources-heading" className="mt-12">
        <h2 id="sources-heading" className="font-semibold text-xl">
          Sources
        </h2>
        {sources.map((source) => (
          <article key={source.id} className="mt-4 rounded-lg border p-4 sm:p-6">
            <h3 className="font-semibold text-lg">{source.title}</h3>
            <dl className="mt-2 grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
              <dt className="text-muted-foreground">URL</dt>
              <dd className="break-all">
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring"
                >
                  {source.url}
                </a>
              </dd>
              <dt className="text-muted-foreground">Captured</dt>
              <dd>{formatDate(source.capturedAt)} UTC</dd>
              <dt className="text-muted-foreground">Captured media</dt>
              <dd>
                {source.media.images.length} images, {source.media.videos.length}{" "}
                videos, {source.media.pdfs.length} PDFs
              </dd>
            </dl>

            <h4 className="mt-6 font-medium">
              Text the assistant can use ({source.sections.length} sections)
            </h4>
            <div className="mt-2 divide-y rounded-md border">
              {source.sections.map((section, index) => (
                <details key={index} className="group p-3">
                  <summary className="cursor-pointer font-medium text-sm focus-visible:outline-2 focus-visible:outline-ring">
                    {section.heading}
                    {section.anchor && (
                      <span className="ml-2 font-normal text-muted-foreground">
                        #{section.anchor}
                      </span>
                    )}
                  </summary>
                  <p className="mt-2 whitespace-pre-line text-muted-foreground text-sm">
                    {section.text}
                  </p>
                </details>
              ))}
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
