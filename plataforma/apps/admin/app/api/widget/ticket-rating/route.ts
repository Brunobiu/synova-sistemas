import { apiErr, widgetTicketRatingSchema } from "@synova/shared";
import { guardWidgetRequest } from "@/lib/widget/edge";
import { readWidgetRequest, preflightResponse, widgetError, widgetOk } from "@/lib/widget/http";
import { rateTicket } from "@/lib/widget/flows";
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
  const parsed = widgetTicketRatingSchema.safeParse(body);
  if (!parsed.success) {
    return widgetError({
      status: 422,
      body: apiErr("validation", "Dados inválidos."),
      headers: guard.headers,
    });
  }

  try {
    const res = await rateTicket(
      guard.scope,
      parsed.data.ticketId,
      parsed.data.rating,
      parsed.data.comment,
    );
    if (!res.ok) {
      return widgetError({
        status: 404,
        body: apiErr("not_found", res.error),
        headers: guard.headers,
      });
    }
    return widgetOk({ csat: res.csat, alreadyRated: res.alreadyRated }, guard.headers);
  } catch (err) {
    captureError(err, { scope: "widget.ticket_rating", systemId: guard.scope.systemId });
    return widgetError({
      status: 500,
      body: apiErr("server_error", "Erro ao registrar a avaliação."),
      headers: guard.headers,
    });
  }
}
