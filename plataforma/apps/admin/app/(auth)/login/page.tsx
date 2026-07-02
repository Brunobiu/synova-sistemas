import { LoginForm } from "@/components/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; next?: string }>;
}) {
  const { erro, next } = await searchParams;
  const initialError =
    erro === "sem_permissao"
      ? "Sua conta não tem permissão de administrador."
      : null;

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <LoginForm initialError={initialError} nextPath={next ?? "/erp"} />
    </main>
  );
}
