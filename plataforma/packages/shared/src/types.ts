// Contratos de resposta de API compartilhados (envelope padrão).

export type ApiErrorCode =
  | "unauthorized"
  | "forbidden"
  | "validation"
  | "rate_limited"
  | "not_found"
  | "server_error";

export interface ApiErrorBody {
  ok: false;
  code: ApiErrorCode;
  message: string;
  details?: unknown;
}

export interface ApiOk<T> {
  ok: true;
  data: T;
}

export type ApiResponse<T> = ApiOk<T> | ApiErrorBody;
