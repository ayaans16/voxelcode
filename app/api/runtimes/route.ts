import { detectRuntimes } from "@/runner/native/runtimes";
import { guardNativeRequest } from "@/runner/native/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Which of Java, C and Go can be compiled on this machine. */
export async function GET(req: Request) {
  const guard = guardNativeRequest(req.headers, { requireJson: false });
  if (!guard.ok) {
    return Response.json({ enabled: false, reason: guard.reason }, { status: guard.status });
  }
  return Response.json({ enabled: true, runtimes: await detectRuntimes() });
}
