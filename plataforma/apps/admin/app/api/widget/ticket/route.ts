import { apiErr, widgetTicketSchema } from "@synova/shared";
import { guardWidgetRequest } from "@/lib/widget/edge";
import { readWidgetRequest, preflightResponse, widgetError, widgetOk } from "@/lib/widget/http";
import { openTicket } from "@/lib/widget/flows";
import { captureError } from "@/lib/observability";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function OPTIONS(req: Request) {
  return preflightResponse(req);
}

export async function POST(req: Request) {
  const parts = readWidgetRequest(req);
  const guard = await guardWidgetRequest({
    apiKey: parts.apiKey,
    origin: parts.origin,
    token: parts.token,
    ip: parts.ip,
  });
  if (!guard.ok) return widgetError(guard);

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const parsed = widgetTicketSchema.safeParse(body);
  if (!parsed.success) {
    return widgetError({
      status: 422,
      body: apiErr("validation", "Dados inválidos."),
      headers: guard.headers,
    });
  }

  try {
    const res = await openTicket(
      guard.scope,
      {
        sessionId: parsed.data.sessionId,
        category: parsed.data.category,
        subject: parsed.data.subject,
        description: parsed.data.description,
        priority: parsed.data.priority,
      },
      parts.ip,
    );
    return widgetOk(res, guard.headers);
  } catch (err) {
    captureError(err, { scope: "widget.ticket", systemId: guard.scope.systemId });
    return widgetError({
      status: 500,
      body: apiErr("server_error", "Erro ao abrir o ticket."),
      headers: guard.headers,
    });
  }
}
