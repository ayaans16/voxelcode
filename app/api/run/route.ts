import { z } from "zod";
import { guardNativeRequest } from "@/runner/native/guard";
import type { NativeEvent } from "@/runner/protocol";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const bodySchema = z.object({
  language: z.enum(["java", "c", "go"]),
  slug: z.string().min(1).max(100),
  which: z.enum(["visible", "hidden"]),
  code: z.string().max(200_000),
});

/**
 * Compiles and runs Java, C or Go for a problem and streams NDJSON events back.
 * The tests are looked up here by slug, so hidden tests never leave the server.
 */
export async function POST(req: Request) {
  const guard = guardNativeRequest(req.headers, { requireJson: true });
  if (!guard.ok) return Response.json({ error: guard.reason }, { status: guard.status });

  // Loaded only after the guard passes: the problem registry (all test data) is large, and a server
  // with the compile server switched off should never pay for it.
  const [{ getProblem }, { functionNameFor }, { toRunTests, timeLimitFor }, { runNative }] = await Promise.all([
    import("@/problems"),
    import("@/problems/languages"),
    import("@/runner/problemRun"),
    import("@/runner/native/execute"),
  ]);

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Bad request." }, { status: 400 });
  const { language, slug, which, code } = parsed.data;
  const problem = getProblem(slug);
  if (!problem) return Response.json({ error: "Unknown problem." }, { status: 404 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (e: NativeEvent) => {
        try {
          controller.enqueue(encoder.encode(JSON.stringify(e) + "\n"));
        } catch {
          /* client went away */
        }
      };
      try {
        await runNative(
          {
            language,
            code,
            functionName: functionNameFor(problem.signature.name, language),
            params: problem.signature.params,
            returns: problem.signature.returns,
            tests: toRunTests(problem, which),
            comparison: problem.comparison,
            timeLimitMs: timeLimitFor(problem, language),
          },
          emit,
          req.signal,
        );
      } catch (e) {
        emit({ type: "fatal", kind: "internal", message: String((e as Error).message ?? e) });
      } finally {
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" } });
}
