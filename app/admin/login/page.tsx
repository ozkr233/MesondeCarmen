"use client";

import { AlertCircle, LogIn } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";

import { Logo } from "@/components/site/Logo";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { site } from "@/lib/site";
import { createClient } from "@/utils/supabase/client";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = safeRedirect(searchParams.get("redirect"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(translateAuthError(authError.message));
      setLoading(false);
      return;
    }

    // refresh() hace que el proxy vea la cookie nueva antes de navegar.
    router.replace(redirectTo);
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-dark px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Logo size={112} className="mx-auto mb-3 h-24 w-24" priority />
          <Link
            href="/"
            className="font-display text-3xl font-black text-white transition-colors hover:text-secondary"
          >
            {site.name}
          </Link>
          <p className="mt-2 text-sm uppercase tracking-widest text-secondary">
            Panel de administración
          </p>
        </div>

        <Card className="p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Correo electrónico"
              type="email"
              required
              autoComplete="email"
              placeholder="admin@mesondecarmen.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <Input
              label="Contraseña"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />

            {error && (
              <p className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle size={18} className="mt-0.5 shrink-0" />
                {error}
              </p>
            )}

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={loading}
            >
              <LogIn size={18} />
              {loading ? "Entrando…" : "Iniciar sesión"}
            </Button>
          </form>
        </Card>

        <p className="mt-6 text-center text-sm text-white/50">
          <Link href="/" className="hover:text-white">
            ← Volver al sitio
          </Link>
        </p>
      </div>
    </main>
  );
}

/**
 * A dónde llevar tras entrar. El parámetro viene de la URL, así que solo se
 * aceptan rutas de este sitio: un "?redirect=https://…" mandaría al dueño a un
 * panel clonado justo después de escribir la contraseña.
 *
 * No basta con mirar el primer carácter: "//evil.com" y "/\evil.com" empiezan
 * por "/" y el navegador los resuelve igualmente como otro origen.
 */
function safeRedirect(value: string | null): string {
  if (!value || !value.startsWith("/")) return "/admin";
  if (value.startsWith("//") || value.startsWith("/\\")) return "/admin";
  return value;
}

function translateAuthError(message: string): string {
  if (/invalid login credentials/i.test(message))
    return "Correo o contraseña incorrectos.";
  if (/email not confirmed/i.test(message))
    return "Debes confirmar el correo antes de entrar.";
  if (/rate limit|too many/i.test(message))
    return "Demasiados intentos. Espera un momento e inténtalo de nuevo.";
  return message;
}
