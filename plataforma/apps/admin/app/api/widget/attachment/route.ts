import { apiErr } from "@synova/shared";
import { guardWidgetRequest } from "@/lib/widget/edge";
import { readWidgetRequest, preflightResponse, widgetError, widgetOk } from "@/lib/widget/http";
import { validateAttachment } from "@/lib/widget/attachments";
import { buildStoragePath, uploadAttachment, signedUrl } from "@/lib/widget/storage";
import { insertAttachment, createNotification } from "@/lib/widget/data";
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

  let file: File | null = null;
  try {
    const form = await req.formData();
    const f = form.get("file");
    if (f instanceof File) file = f;
  } catch {
    file = null;
  }
  if (!file) {
    return widgetError({
      status: 422,
      body: apiErr("validation", "Arquivo ausente."),
      headers: guard.headers,
    });
  }

  const check = validateAttachment({ name: file.name, mimeType: file.type, size: file.size });
  if (!check.ok) {
    return widgetError({
      status: 422,
      body: apiErr("validation", check.error),
      headers: guard.headers,
    });
  }

  try {
    const path = buildStoragePath(guard.scope.systemId, guard.scope.tenantId, check.safeName);
    const bytes = await file.arrayBuffer();
    await uploadAttachment(path, bytes, file.type);
    const attachmentId = await insertAttachment({
      systemId: guard.scope.systemId,
      tenantId: guard.scope.tenantId,
      userId: guard.scope.userId ?? null,
      storagePath: path,
      fileName: check.safeName,
      mimeType: file.type,
      sizeBytes: file.size,
    });
    const url = await signedUrl(path, 300);
    // Notificação de evento de arquivo (best-effort; não derruba o upload).
    try {
      await createNotification({
        systemId: guard.scope.systemId,
        tenantId: guard.scope.tenantId,
        type: "file_uploaded",
        priority: "baixa",
        title: "Arquivo enviado pelo cliente",
        body: check.safeName,
        entityType: "attachment",
        entityId: attachmentId,
      });
    } catch {
      /* ignora falha de notificação */
    }
    return widgetOk(
      { attachmentId, fileName: check.safeName, mimeType: file.type, size: file.size, url },
      guard.headers,
    );
  } catch (err) {
    captureError(err, { scope: "widget.attachment", systemId: guard.scope.systemId });
    return widgetError({
      status: 500,
      body: apiErr("server_error", "Erro ao enviar o anexo."),
      headers: guard.headers,
    });
  }
}
