"use client";

import { useState, type FormEvent } from "react";
import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TestTurnResult } from "@/lib/chat/agent";

const EXAMPLES = [
  "What is included in the package?",
  "Can you send me a brochure?",
  "Send me the brochure and a video.",
  "Do you offer paragliding?",
];

export function TestQuestion() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TestTurnResult | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);

  async function run(text: string) {
    setLoading(true);
    setResult(null);
    setRequestError(null);
    try {
      const response = await fetch("/api/knowledge/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text }),
      });
      const data = await response.json();
      if (!response.ok) {
        setRequestError(data.error ?? "Something went wrong.");
      } else {
        setResult(data);
      }
    } catch {
      setRequestError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (question.trim()) run(question);
  }

  return (
    <div className="mt-4">
      <form onSubmit={onSubmit} className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="test-question" className="sr-only">
          Test question
        </label>
        <Input
          id="test-question"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Ask something a customer might ask"
          maxLength={500}
        />
        <Button type="submit" disabled={loading || !question.trim()}>
          {loading ? "Running…" : "Run"}
        </Button>
      </form>

      <div className="mt-3 flex flex-wrap gap-2">
        {EXAMPLES.map((example) => (
          <Button
            key={example}
            type="button"
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={() => {
              setQuestion(example);
              run(example);
            }}
          >
            {example}
          </Button>
        ))}
      </div>

      <div aria-live="polite" className="mt-6">
        {loading && (
          <p className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2Icon className="size-4 animate-spin" />
            Running the question on the server…
          </p>
        )}
        {requestError && (
          <p role="alert" className="rounded-md bg-destructive/10 p-3 text-destructive text-sm">
            {requestError}
          </p>
        )}
        {result && <TestResult result={result} />}
      </div>
    </div>
  );
}

function TestResult({ result }: { result: TestTurnResult }) {
  return (
    <div className="space-y-6">
      {result.error && (
        <p role="alert" className="rounded-md bg-destructive/10 p-3 text-destructive text-sm">
          {result.error}
        </p>
      )}

      <div>
        <h3 className="font-medium">Sections selected ({result.sections.length})</h3>
        <p className="text-muted-foreground text-sm">
          Searched with: “{result.query}”
          {result.usedFallback &&
            " · Nothing matched, so the overview sections were sent instead."}
        </p>
        <ul className="mt-2 divide-y rounded-md border">
          {result.sections.map((section) => (
            <li key={section.heading} className="p-3 text-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-medium">{section.heading}</span>
                <span className="text-muted-foreground text-xs">
                  score {section.score}
                </span>
              </div>
              <a
                href={section.link}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all text-muted-foreground text-xs underline underline-offset-2"
              >
                {section.link}
              </a>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="font-medium">Media selected</h3>
        {result.media.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {result.error ? "Unknown, the model call failed." : "None."}
          </p>
        ) : (
          <ul className="mt-1 list-disc pl-5 text-sm">
            {result.media.map(({ tool, result: media }) => (
              <li key={tool}>
                <code>{tool}</code> →{" "}
                {media.available
                  ? `${media.title} (${media.origin === "website" ? "from the website" : "demo"})`
                  : media.message}
              </li>
            ))}
          </ul>
        )}
      </div>

      {result.answer !== null && (
        <div>
          <h3 className="font-medium">Answer ({result.modelName})</h3>
          <p className="mt-1 whitespace-pre-line rounded-md bg-muted p-3 text-sm">
            {result.answer || "(No text, only media.)"}
          </p>
        </div>
      )}

      <details>
        <summary className="cursor-pointer font-medium focus-visible:outline-2 focus-visible:outline-ring">
          Exact instructions sent to the model
        </summary>
        <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap rounded-md bg-muted p-3 font-mono text-xs">
          {result.instructions}
        </pre>
      </details>
    </div>
  );
}
