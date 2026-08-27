import { ExternalLink, ShieldAlert } from "lucide-react";
import Link from "next/link";

import { AdminNav } from "@/components/admin/AdminNav";
import { LogoutButton } from "@/components/admin/LogoutButton";
import { Logo } from "@/components/site/Logo";
import { site } from "@/lib/site";
import { createClient } from "@/utils/supabase/server";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const email = data?.claims?.email as string | undefined;

  /**
   * El proxy ya comprobó que hay sesión; esto comprueba lo otro: que además la
   * cuenta esté dada de alta en `admins`. Sin este guardia, un usuario recién
   * creado y todavía sin permisos vería el panel entero y sus ediciones se
   * perderían en silencio: un UPDATE que RLS deja fuera no da error, afecta a
   * cero filas y PostgREST responde éxito.
   *
   * No se redirige a /admin/login porque el proxy manda a /admin a quien ya
   * tiene sesión, y quedaría un bucle. El aviso se muestra aquí mismo, con el
   * botón de salir del encabezado a mano.
   */
  const { data: isAdmin, error: adminError } = await supabase.rpc("is_admin");

  return (
    <div className="flex min-h-screen flex-col bg-light">
      <header className="bg-dark text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div className="flex items-center gap-3">
            <Logo size={48} className="h-11 w-11 shrink-0" />
            <div>
              <p className="font-display text-xl font-black">{site.name}</p>
              <p className="text-xs uppercase tracking-widest text-secondary">
                Panel de administración
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {email && (
              <span className="hidden text-sm text-white/60 sm:inline">
                {email}
              </span>
            )}
            <Link
              href="/"
              target="_blank"
              className="flex items-center gap-1 text-sm text-white/70 transition-colors hover:text-secondary"
            >
              Ver sitio <ExternalLink size={14} />
            </Link>
            <LogoutButton />
          </div>
        </div>

        {/* Sin permisos no hay a dónde navegar: las dos pestañas llevan al
            mismo aviso. */}
        {isAdmin && (
          <div className="mx-auto max-w-6xl px-4 pb-2">
            <AdminNav />
          </div>
        )}
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        {isAdmin ? (
          children
        ) : (
          <NoAutorizado email={email} sinFuncion={Boolean(adminError)} />
        )}
      </main>
    </div>
  );
}

/**
 * Dos motivos muy distintos acaban aquí y conviene no confundirlos: o la cuenta
 * no está dada de alta, o la migración que crea `is_admin()` todavía no se ha
 * ejecutado contra esta base. Lo segundo solo lo ve quien despliega, y sin este
 * mensaje parecería un problema de permisos que no lo es.
 */
function NoAutorizado({
  email,
  sinFuncion,
}: {
  email?: string;
  sinFuncion: boolean;
}) {
  return (
    <div className="mx-auto max-w-lg rounded-xl bg-white p-8 text-center shadow-sm">
      <ShieldAlert size={40} className="mx-auto text-amber-500" />
      <h1 className="mt-4 text-xl font-bold text-dark">
        {sinFuncion ? "No se pudo comprobar el acceso" : "Cuenta sin permisos"}
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-dark/60">
        {sinFuncion ? (
          <>
            La base de datos no responde a <code>is_admin()</code>. Si acabas de
            desplegar, falta ejecutar{" "}
            <code>supabase/07_rls_solo_admin.sql</code> en el editor SQL de
            Supabase.
          </>
        ) : (
          <>
            {email ? <strong>{email}</strong> : "Esta cuenta"} inició sesión
            correctamente, pero no está en la lista de administradores. Pídele
            al dueño que te dé de alta.
          </>
        )}
      </p>
    </div>
  );
}
