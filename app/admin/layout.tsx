import type { Metadata } from "next";

/**
 * Layout puente que solo existe para sacar el panel de los buscadores.
 *
 * Va aquí y no en `(panel)/layout.tsx` porque así cubre también
 * `/admin/login`, que es un componente de cliente y por tanto no puede
 * exportar `metadata`.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminSeoLayout({
  children,
}: LayoutProps<"/admin">) {
  return children;
}
