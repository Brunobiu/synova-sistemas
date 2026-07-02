import type { ApiErrorBody, ApiErrorCode, ApiOk } from "./types";

// Helpers para montar respostas de API padronizadas e sanitizar erros, evitando
// vazar mensagens internas (stack, SQL, etc.) para clientes públicos do widget.

export function apiOk<T>(data: T): ApiOk<T> {
  return { ok: true, data };
}

export function apiErr(
  code: ApiErrorCode,
  message: string,
  details?: unknown,
): ApiErrorBody {
  return details === undefined
    ? { ok: false, code, message }
    : { ok: false, code, message, details };
}

/** Status HTTP correspondente a cada código de erro do envelope. */
export function httpStatusForCode(code: ApiErrorCode): number {
  switch (code) {
    case "unauthorized":
      return 401;
    case "forbidden":
      return 403;
    case "validation":
      return 422;
    case "rate_limited":
      return 429;
    case "not_found":
      return 404;
    case "server_error":
    default:
      return 500;
  }
}

// Mensagens genéricas e seguras por código (nunca expõem detalhes internos).
const SAFE_MESSAGES: Record<ApiErrorCode, string> = {
  unauthorized: "Não autorizado.",
  forbidden: "Acesso negado.",
  validation: "Dados inválidos.",
  rate_limited: "Muitas requisições. Tente novamente em instantes.",
  not_found: "Não encontrado.",
  server_error: "Erro interno. Tente novamente mais tarde.",
};

export function safeMessage(code: ApiErrorCode): string {
  return SAFE_MESSAGES[code];
}

/**
 * Converte qualquer erro em um envelope seguro. Por padrão vira server_error
 * genérico; o código real pode ser informado quando for conhecido e seguro expor.
 */
export function sanitizeError(
  _error: unknown,
  code: ApiErrorCode = "server_error",
): ApiErrorBody {
  return apiErr(code, safeMessage(code));
}
