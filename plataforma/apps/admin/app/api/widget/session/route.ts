import { apiErr } from "@synova/shared";
import { guardKeyAndOrigin } from "@/lib/widget/edge";
import { readWidgetRequest, preflightResponse, widgetError, widgetOk } from "@/lib/widget/http";
import { initSession } from "@/lib/widget/flows";
import { captureError } from "@/lib/observability";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function OPTIONS(req: Request) {
  return preflightResponse(req);
}

export async function POST(req: Request) {
  const parts = readWidgetRequest(req);
  const guard = await guardKeyAndOrigin({ apiKey: parts.apiKey, origin: parts.origin, ip: parts.ip });
  if (!guard.ok) return widgetError(guard);

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);

  try {
    const result = await initSession(
      {
        externalRef: str(body.externalRef),
        name: str(body.name),
        email: str(body.email),
        sessionId: str(body.sessionId),
      },
      guard.systemAuth,
    );
    return widgetOk(result, guard.headers);
  } catch (err) {
    captureError(err, { scope: "widget.session", systemId: guard.systemAuth.systemId });
    return widgetError({
      status: 500,
      body: apiErr("server_error", "Erro ao iniciar a sessão."),
      headers: guard.headers,
    });
  }
}
