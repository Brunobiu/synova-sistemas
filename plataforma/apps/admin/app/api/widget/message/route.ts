import { apiErr, widgetMessageSchema } from "@synova/shared";
import { guardWidgetRequest } from "@/lib/widget/edge";
import { readWidgetRequest, preflightResponse, widgetError, widgetOk } from "@/lib/widget/http";
import { handleMessage } from "@/lib/widget/flows";

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
  const parsed = widgetMessageSchema.safeParse(body);
  if (!parsed.success) {
    return widgetError({
      status: 422,
      body: apiErr("validation", "Dados inválidos."),
      headers: guard.headers,
    });
  }

  try {
    const res = await handleMessage(
      guard.scope,
      {
        sessionId: parsed.data.sessionId,
        content: parsed.data.content,
        attachmentIds: parsed.data.attachmentIds,
      },
      parts.ip,
    );
    if (!res.ok) {
      return widgetError({
        status: 422,
        body: apiErr("validation", res.error),
        headers: guard.headers,
      });
    }
    return widgetOk(
      { messageId: res.messageId, reply: res.reply, escalated: res.escalated, ticketId: res.ticketId },
      guard.headers,
    );
  } catch {
    return widgetError({
      status: 500,
      body: apiErr("server_error", "Erro ao processar a mensagem."),
      headers: guard.headers,
    });
  }
}
