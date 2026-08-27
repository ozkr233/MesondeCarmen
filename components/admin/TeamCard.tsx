"use client";

import {
  AlertCircle,
  Check,
  Loader2,
  ShieldCheck,
  UserPlus,
  X,
} from "lucide-react";
import { useState, type FormEvent } from "react";

import { createAdmin, revokeAdmin } from "@/app/admin/team-actions";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import type { TeamMember } from "@/lib/admins";

const EMPTY = { email: "", password: "", note: "" };

/** Fecha corta y en local, que aquí solo interesa el día. */
function formatDate(value: string | null): string {
  if (!value) return "nunca";
  return new Date(value).toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function TeamCard({
  members,
  currentUserId,
}: {
  members: TeamMember[];
  currentUserId: string | null;
}) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<string | null>(null);
  /** Id de la persona cuya baja se está procesando. */
  const [revoking, setRevoking] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    setSaving(true);
    setError(null);
    setCreated(null);

    const result = await createAdmin(form);
    setSaving(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    // La contraseña se limpia junto al resto: no tiene por qué quedarse a la
    // vista una vez creada la cuenta.
    setCreated(form.email.trim().toLowerCase());
    setForm(EMPTY);
  }

  async function handleRevoke(member: TeamMember) {
    if (revoking) return;
    const confirmed = window.confirm(
      `¿Quitarle el acceso al panel a ${member.email}?\n\n` +
        "Su cuenta seguirá existiendo, solo dejará de poder administrar.",
    );
    if (!confirmed) return;

    setRevoking(member.userId);
    setError(null);
    setCreated(null);

    const result = await revokeAdmin(member.userId);
    setRevoking(null);
    if (result.error) setError(result.error);
  }

  return (
    <>
      <Card className="mb-6 p-5">
        <h2 className="mb-1 flex items-center gap-2 text-lg font-bold text-dark">
          <UserPlus size={18} className="text-primary" />
          Dar acceso a alguien
        </h2>
        <p className="mb-4 text-sm text-dark/50">
          Se crea la cuenta y se le dan permisos de una vez. Pásale tú la
          contraseña; puede cambiarla después desde su perfil.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Correo"
              type="email"
              required
              autoComplete="off"
              placeholder="persona@ejemplo.com"
              value={form.email}
              onChange={(event) =>
                setForm({ ...form, email: event.target.value })
              }
            />
            <Input
              label="Contraseña inicial"
              type="text"
              required
              minLength={8}
              autoComplete="off"
              placeholder="Mínimo 8 caracteres"
              hint="En texto visible a propósito: tienes que poder copiarla."
              value={form.password}
              onChange={(event) =>
                setForm({ ...form, password: event.target.value })
              }
            />
          </div>

          <Input
            label="Nota (opcional)"
            maxLength={80}
            placeholder="Carmen, cocina"
            hint="Para que en la lista sepas quién es cada quien."
            value={form.note}
            onChange={(event) => setForm({ ...form, note: event.target.value })}
          />

          {error && (
            <p className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              {error}
            </p>
          )}

          {created && (
            <p className="flex items-start gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-800">
              <Check size={18} className="mt-0.5 shrink-0" />
              <span>
                <strong>{created}</strong> ya puede entrar al panel.
              </span>
            </p>
          )}

          <div className="flex justify-end">
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 size={16} className="animate-spin" />}
              {saving ? "Creando…" : "Dar acceso"}
            </Button>
          </div>
        </form>
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-dark/10 px-5 py-4">
          <h2 className="flex items-center gap-2 text-lg font-bold text-dark">
            <ShieldCheck size={18} className="text-primary" />
            Con acceso al panel
            <span className="text-sm font-semibold text-dark/40">
              ({members.length})
            </span>
          </h2>
        </div>

        {members.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-dark/50">
            No se pudo cargar la lista. Revisa que
            <code className="mx-1">supabase/07_rls_solo_admin.sql</code>
            se haya ejecutado.
          </p>
        ) : (
          <ul className="divide-y divide-dark/5">
            {members.map((member) => {
              const isSelf = member.userId === currentUserId;
              return (
                <li
                  key={member.userId}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-dark">
                      {member.email}
                      {isSelf && (
                        <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-primary">
                          tú
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-dark/50">
                      {member.note ? `${member.note} · ` : ""}
                      alta {formatDate(member.createdAt)} · último acceso{" "}
                      {formatDate(member.lastSignInAt)}
                    </p>
                  </div>

                  {/* Quitarse a uno mismo lo rechaza también el servidor; aquí
                      se desactiva para no ofrecer un botón que va a fallar. */}
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isSelf || revoking === member.userId}
                    title={
                      isSelf ? "No puedes quitarte los permisos a ti mismo" : undefined
                    }
                    onClick={() => handleRevoke(member)}
                    className="text-red-700 hover:bg-red-50"
                  >
                    {revoking === member.userId ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <X size={15} />
                    )}
                    Quitar acceso
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </>
  );
}
