/**
 * Escopo obrigatório para qualquer consulta multi-tenant.
 * Toda leitura/escrita de dados de atendimento deve passar por aqui,
 * garantindo o filtro por system_id (e tenant_id quando aplicável).
 */
export interface QueryScope {
  systemId: string;
  tenantId?: string;
}

export function assertScope(
  scope: Partial<QueryScope> | null | undefined,
): asserts scope is QueryScope {
  if (!scope || !scope.systemId) {
    throw new Error(
      "Escopo inválido: system_id é obrigatório para acessar dados multi-tenant.",
    );
  }
}

/** Query builder mínimo (compatível com o do supabase-js) para aplicar filtros. */
interface Filterable {
  eq(column: string, value: unknown): this;
}

/**
 * Aplica o escopo a um query builder estilo supabase-js:
 * sempre filtra por system_id e, se informado, por tenant_id.
 * Lança se o escopo não tiver system_id (evita consultas sem isolamento).
 */
export function applyScope<Q extends Filterable>(query: Q, scope: QueryScope): Q {
  assertScope(scope);
  let q = query.eq("system_id", scope.systemId);
  if (scope.tenantId) {
    q = q.eq("tenant_id", scope.tenantId);
  }
  return q;
}
