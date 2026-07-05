// Captura de erros server-side com log estruturado (capturável pelos logs da
// Vercel/observabilidade). Fica pronto para Sentry: quando SENTRY_DSN estiver
// definido, basta plugar @sentry/nextjs aqui (drop-in) sem mudar as chamadas.

export interface ErrorContext {
  scope?: string;
  [key: string]: unknown;
}

export function captureError(error: unknown, context: ErrorContext = {}): void {
  const payload = {
    level: "error" as const,
    scope: context.scope ?? "app",
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    ...context,
  };
  // Log estruturado (uma linha JSON) — nunca expõe isto ao cliente.
  console.error(JSON.stringify(payload));

  // Ponto de extensão para Sentry:
  //   if (process.env.SENTRY_DSN) Sentry.captureException(error, { extra: context });
}
