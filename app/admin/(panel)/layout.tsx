import { ExternalLink } from "lucide-react";
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

        <div className="mx-auto max-w-6xl px-4 pb-2">
          <AdminNav />
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        {children}
      </main>
    </div>
  );
}
