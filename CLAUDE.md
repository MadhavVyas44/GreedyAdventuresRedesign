# Greedy Adventures: Sea View Skydiving assignment

Take-home for Greedy Adventures (Full Stack Developer, Round 1).
Source page: https://www.greedyadventures.com/experiences/sea-view-skydiving

Prefer simple, readable code over clever code, and explain each change in plain words when you finish.

## What the brief requires

- One Next.js + TypeScript page based on Sea View Skydiving.
- Redesign the **hero** and **package** sections in a clean, premium theme. Page and chat must be responsive and keyboard-accessible. Credit any reused open-source work in the README.
- Chat built with **assistant-ui**, connected to a working AI backend. It answers from the captured website info, links to its source, and remembers the conversation for follow-ups.
- The response format must match the request:
  - "What is included in the package?" → text
  - "Can you send me a brochure?" → PDF shown in chat with open/download
  - "Can I see a video of the experience?" → video in chat, or a clearly labelled link
  - "Send me the brochure and a video." → both
- Media: website material, or simple samples labelled as demo.
- If an answer or file is unavailable, say so. Never make things up. Show clear loading and error states.
- **Knowledge view:** read-only, connected to the backend, reachable from the demo.
  - Shows each source: title, URL, capture date, and the text the bot can use. Lists available PDFs and videos.
  - For a test question, shows the actual source text passed to the model and any PDF/video selected. This must come from real backend activity, not sample data.
  - No API keys or private conversations. No editing, uploads or admin features.
- Code quality: separate UI, knowledge, chat/model logic and media handling. Secrets server-side, validate inputs, render responses safely.
- Prototype only: no bookings, payments, login, database or crawler.
- Submission: Vercel link + repo, plus a README covering setup, sources, agent flow, how to open the knowledge view, limitations and AI assistance.
- Verification steps: answers, follow-ups, PDF/video delivery, missing info and model failures, with repeatable checks for media selection and fallback. Label any mock mode.
- Assessed on: frontend quality, working behaviour, agent structure, code clarity, understanding.

## Stack (versions matter)

- Next.js App Router + TypeScript, scaffolded with `npx assistant-ui create` (default template).
- assistant-ui components live in `components/*.aui.tsx`, not `components/assistant-ui/elements/`. Import from the real paths.
- Tool UIs use `makeAssistantToolUI`. It is deprecated in favour of `defineToolkit`, but kept on purpose as the smaller change. Don't migrate unless asked. Every tool UI component must be rendered inside `<AssistantRuntimeProvider>` in `app/assistant.tsx`, or the grey fallback box shows instead.
- **Vercel AI SDK v7.**
  - Return the stream with `createUIMessageStreamResponse({ stream: toUIMessageStream({ stream: result.stream, ... }) })`. `result.toUIMessageStreamResponse()` is deprecated.
  - Tools use `inputSchema: zodSchema(...)`, and `convertToModelMessages` is awaited.
  - If `system:` shows as deprecated, rename it to `instructions:`.
- **Model:** Gemini via `@ai-sdk/google`.
  - Env vars: `GOOGLE_GENERATIVE_AI_API_KEY` and `MODEL_ID`.
  - Only Flash / Flash-Lite models are on the free tier. A non-free model returns 429, and the SDK retries before failing, so it fails slowly.
  - Free-tier Flash allowed only 20 requests/day per project (hit on 30 Oct). A brochure/video answer costs 2. Use the mock model (`MOCK_MODEL=true`) for repeated testing.
- Local development: Windows + PowerShell. Cloud sessions run Linux, where paths are case-sensitive.

## Current state (30 Oct 2026)

How it fits together:

- `app/api/chat/route.ts`: zod-checks the body, drops browser `system` messages, calls `prepareTurn` (`lib/chat/agent.ts`), streams. The instructions and tools are server-owned. Errors are logged server-side and the customer sees a friendly message.
- `prepareTurn`: `selectSections` (`lib/knowledge/select.ts`) → `buildSystemPrompt` (`lib/chat/prompt.ts`) → Gemini or the mock model, `tools` from `lib/chat/tools.ts`. The knowledge view's test box uses the same function, via `runTestTurn`.
- `knowledge/sources/sea-view-skydiving.json`: the page captured with a browser console script. Fields: id, title, url, capturedAt, sections[{heading, anchor, text}], media{images, videos, pdfs}. It includes package prices (฿9,500 / ฿12,500 / ฿14,000 per person).
- `public/media/brochure-demo.pdf`: demo brochure, a print of the website page.
- `public/media/site/`: all 13 captured site images, downloaded 30 Oct so cloud sessions don't need to fetch them. Videos stay linked from the site; `media.videos` includes `deluxe-landscape.mp4` and `vip-landscape.mp4` (short package clips, ~3–4 MB).
- The chat page is still the full-screen assistant-ui starter layout. It gets replaced by the redesign.
- Chat state lives only in memory: leaving the page wipes it. That's why links in chat and the knowledge link open in a new tab.
- Not yet seen in a browser: the video card and the knowledge view (only tested over HTTP). Check them on the Vercel preview.

To do, roughly in order:

- [x] Confirm the brochure card renders. Then render tool calls inline instead of inside the collapsed ToolGroup in `components/thread.aui.tsx`.
- [x] System prompt: after showing media, reply with one short sentence and no source link.
- [x] Add `maxRetries: 1` to `streamText`.
- [x] Validate the `/api/chat` request body with zod.
- [x] Add a `showVideo` tool and card. Uses the site's main film (`media.videos[0]`). Tools in `lib/chat/tools.ts`, media list in `lib/media/manifest.ts`. Brochure card has open + download.
- [x] Select relevant sections per question instead of the whole page (`lib/knowledge/select.ts`, prompt in `lib/chat/prompt.ts`).
- [x] Mock model (`MOCK_MODEL=true`, `lib/chat/mock-model.ts`): fixed rules, every reply starts "(Demo: mock model)".
- [x] Knowledge view at `/knowledge` (linked from the chat header, opens in a new tab). Test box posts to `/api/knowledge/test`, which runs `runTestTurn` in `lib/chat/agent.ts`: same `prepareTurn` as the chat. Nothing stored.
- [ ] Redesign the hero and packages (see Design), then a responsive and keyboard pass.
- [ ] README, verification steps, and repeatable tests with a labelled mock model.
- [ ] Deploy to Vercel with env vars in BOTH Production and Preview.

## Target folder split

- `app/`: pages and thin route handlers only
- `components/`: UI
- `lib/knowledge/`: load sources, select relevant sections
- `lib/chat/`: system prompt, tool definitions, model config
- `lib/media/`: media manifest (PDFs, videos) and lookup
- `knowledge/sources/*.json`: captured website data
- `public/media/`: PDF, demo files, and downloaded site images (`public/media/site/`)

## Design

**Status: proposed on 30 Oct, not yet approved by the user.** Confirm with them before building, and apply any changes they ask for.

Concept: "The view is the product". A calm, premium navy-and-cream editorial look with big photos and little clutter.

- **Fonts:** Barlow Condensed (uppercase, semi-bold) for headings; Inter (already loaded) for body text.
- **Colours:** deep navy `#0B1F33` (hero, headings, dark sections), warm cream `#F6F0E6` (page background), slate `#5B6B7A` (body and secondary text), sunset coral `#E8743B` (buttons and highlights, used sparingly). Check WCAG AA contrast before use.
- **Hero:** full-width `tandem-with-sea-view.webp` under a navy gradient. Big uppercase "SEA VIEW SKYDIVING", with "Tandem jump over Pattaya" and a one-line summary from the page. A fact strip from Highlights: 13,000 ft · ~60 s freefall · 5–7 min under canopy · No experience needed. Buttons: "See packages · from ฿9,500" (coral) and "▶ Watch the film" (outline). The film opens only on click: no autoplay (12 MB), and none for people who prefer reduced motion.
- **Packages:** list the shared inclusions once, above the cards ("Every package includes: tandem jump · safety briefing and instructor · aircraft climb with ocean view · certificate"), backed by "Same aircraft, altitude and instructors in every package". Each card is about what it adds:
  - ECO: "The jump, nothing else", ฿9,500. Still image (`eco-landscape.jpg`).
  - DELUXE: "Video and photos", ฿12,500. Plays the site's `deluxe-landscape.mp4` on hover or focus, with its poster.
  - VIP: "Personal cameraman and edited film", ฿14,000. Same, with `vip-landscape.mp4`.
  - Each card's button reads "Ask about <package>" and opens the chat with that question filled in. No booking.
  - Never add a "Most popular" badge, or claim VIP includes Deluxe's photos. The page says neither.
- **Chat placement:** a floating "Ask us" button at the bottom right opens a chat panel (full-screen on mobile), on the same page as the content, so scrolling never loses the chat. The panel header keeps the "Knowledge view" link.
- **Scope below the packages:** a compact 5-step "The plan" timeline and a simple footer, with light styling only. Effort goes into the hero and packages.

## Rules

- Never commit secrets or print env values.
- Never invent prices or facts. All content comes from the knowledge JSON.
- Label demo media and any mock mode as "demo".
- Before pushing, `npm run build` must pass, and `npm test` too once tests exist.
- After each meaningful change, log it: date, what changed, why, and any problem hit and how it was fixed.
  - In local sessions, add the entry to `docs/DEVLOG.md`. It is gitignored, so never commit it.
  - In cloud sessions that file doesn't exist. End your final message with the entry under a "Devlog" heading instead. Don't put it in the PR description.
