"use client";

import { LogOut } from "lucide-react";
import { useTransition } from "react";

import { signOut } from "@/app/admin/actions";

export function LogoutButton() {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => void signOut())}
      className="flex items-center gap-1.5 rounded-lg border border-white/20 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-white/10 disabled:opacity-60"
    >
      <LogOut size={15} />
      {pending ? "Saliendo…" : "Salir"}
    </button>
  );
}
