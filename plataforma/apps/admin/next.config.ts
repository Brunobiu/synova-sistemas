import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pacotes internos do monorepo consumidos como código-fonte TS.
  transpilePackages: [
    "@synova/ai",
    "@synova/database",
    "@synova/shared",
    "@synova/ui",
  ],
  // Caminho A: a landing institucional (estática, em public/) é servida na raiz,
  // mantendo a URL "/". As rotas do app (/erp, /meu-atendimento, /login, /api...)
  // continuam funcionando normalmente. beforeFiles garante que "/" caia na home
  // antes da rota placeholder do app.
  async rewrites() {
    return {
      beforeFiles: [{ source: "/", destination: "/home.html" }],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
