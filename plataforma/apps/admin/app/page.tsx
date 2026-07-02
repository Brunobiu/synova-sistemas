import { cn } from "@synova/ui";
import { PRIORITIES } from "@synova/shared";

export default function Home() {
  return (
    <main className={cn("min-h-screen flex items-center justify-center p-8")}>
      <div className="text-center">
        <h1 className="text-2xl font-semibold">Synova — Plataforma</h1>
        <p className="mt-2 text-sm text-gray-500">
          Cockpit administrativo (ERP + Suporte). Em construção.
        </p>
        <p className="mt-4 text-xs text-gray-400">
          Prioridades suportadas: {PRIORITIES.join(", ")}
        </p>
      </div>
    </main>
  );
}
