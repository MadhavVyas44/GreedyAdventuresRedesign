import { z } from "zod";
import { runTestTurn } from "@/lib/chat/agent";

export const maxDuration = 30;

const requestSchema = z.object({
  question: z.string().trim().min(1).max(500),
});

export async function POST(req: Request) {
  const body = requestSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return Response.json(
      { error: "Enter a question of up to 500 characters." },
      { status: 400 },
    );
  }

  return Response.json(await runTestTurn(body.data.question));
}
