import { apiErr, widgetHistoryQuerySchema } from "@synova/shared";
import { guardWidgetRequest } from "@/lib/widget/edge";
import { readWidgetRequest, preflightResponse, widgetError, widgetOk } from "@/lib/widget/http";
import { getHistory } from "@/lib/widget/flows";
import { captureError } from "@/lib/observability";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function OPTIONS(req: Request) {
  return preflightResponse(req);
}

export async function GET(req: Request) {
  const parts = readWidgetRequest(req);
  const guard = await guardWidgetRequest({
    apiKey: parts.apiKey,
    origin: parts.origin,
    token: parts.token,
    ip: parts.ip,
  });
  if (!guard.ok) return widgetError(guard);

  const url = new URL(req.url);
  const sessionId = url.searchParams.get("sessionId") ?? undefined;
  const limit = url.searchParams.get("limit") ?? undefined;
  const parsed = widgetHistoryQuerySchema.safeParse({
    ...(sessionId ? { sessionId } : {}),
    ...(limit ? { limit } : {}),
  });
  if (!parsed.success) {
    return widgetError({
      status: 422,
      body: apiErr("validation", "Parâmetros inválidos."),
      headers: guard.headers,
    });
  }

  try {
    const res = await getHistory(guard.scope, parsed.data.sessionId, parsed.data.limit);
    if (!res.ok) {
      return widgetError({
        status: 422,
        body: apiErr("validation", res.error),
        headers: guard.headers,
      });
    }
    return widgetOk({ sessionId: res.sessionId, chatId: res.chatId, history: res.history }, guard.headers);
  } catch (err) {
    captureError(err, { scope: "widget.history", systemId: guard.scope.systemId });
    return widgetError({
      status: 500,
      body: apiErr("server_error", "Erro ao buscar o histórico."),
      headers: guard.headers,
    });
  }
}
