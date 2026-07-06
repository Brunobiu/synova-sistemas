import { apiErr, widgetTicketThreadQuerySchema } from "@synova/shared";
import { guardWidgetRequest } from "@/lib/widget/edge";
import { readWidgetRequest, preflightResponse, widgetError, widgetOk } from "@/lib/widget/http";
import { getTicketThread } from "@/lib/widget/flows";
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
  const parsed = widgetTicketThreadQuerySchema.safeParse({
    ticketId: url.searchParams.get("ticketId") ?? "",
  });
  if (!parsed.success) {
    return widgetError({
      status: 422,
      body: apiErr("validation", "Parâmetros inválidos."),
      headers: guard.headers,
    });
  }

  try {
    const res = await getTicketThread(guard.scope, parsed.data.ticketId);
    if (!res.ok) {
      return widgetError({
        status: 404,
        body: apiErr("not_found", res.error),
        headers: guard.headers,
      });
    }
    return widgetOk({ ticket: res.ticket, messages: res.messages }, guard.headers);
  } catch (err) {
    captureError(err, { scope: "widget.ticket_thread", systemId: guard.scope.systemId });
    return widgetError({
      status: 500,
      body: apiErr("server_error", "Erro ao carregar o chamado."),
      headers: guard.headers,
    });
  }
}
