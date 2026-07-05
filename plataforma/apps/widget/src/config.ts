// Configuração do widget lida dos atributos data-* da tag <script>.

export interface WidgetConfig {
  apiBase: string;
  apiKey: string;
  title: string;
  color: string;
}

export interface RawConfig {
  synovaKey?: string | null;
  apiBase?: string | null;
  title?: string | null;
  color?: string | null;
}

const DEFAULTS = {
  title: "Suporte",
  color: "#4f46e5",
};

/**
 * Monta a config a partir dos data-attributes. `data-synova-key` é obrigatório.
 * `data-api-base` cai para a origem do próprio script quando ausente.
 */
export function buildConfig(raw: RawConfig, fallbackOrigin: string): WidgetConfig {
  const apiKey = (raw.synovaKey ?? "").trim();
  if (!apiKey) throw new Error("Synova: data-synova-key é obrigatório.");
  const apiBase = (raw.apiBase ?? "").trim() || fallbackOrigin;
  return {
    apiKey,
    apiBase: apiBase.replace(/\/+$/, ""),
    title: (raw.title ?? "").trim() || DEFAULTS.title,
    color: (raw.color ?? "").trim() || DEFAULTS.color,
  };
}

export function readConfigFromScript(script: HTMLScriptElement, fallbackOrigin: string): WidgetConfig {
  return buildConfig(
    {
      synovaKey: script.getAttribute("data-synova-key"),
      apiBase: script.getAttribute("data-api-base"),
      title: script.getAttribute("data-title"),
      color: script.getAttribute("data-color"),
    },
    fallbackOrigin,
  );
}
