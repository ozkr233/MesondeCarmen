import type { NextConfig } from "next";

/**
 * Hosts permitidos para <Image>. El de Supabase se deduce de la URL del
 * proyecto para no tener que tocar este archivo al cambiar de entorno.
 */
const remotePatterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [
  // Fotos de ejemplo del diseño original (se reemplazan al subir las propias).
  { protocol: "https", hostname: "z-cdn-media.chatglm.cn" },
];

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (supabaseUrl) {
  try {
    remotePatterns.push({
      protocol: "https",
      hostname: new URL(supabaseUrl).hostname,
      pathname: "/storage/v1/object/public/**",
    });
  } catch {
    // URL mal formada en .env.local: se ignora en vez de romper el build.
  }
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns,
    // Sin optimización de Vercel: cada ancho de cada foto contaba como una
    // transformación y el plan Hobby se quedó sin cupo (las nuevas daban 402 y
    // la carta salía sin fotos). Las fotos ya llegan optimizadas desde la
    // subida (`lib/compress-image.ts`) y se sirven tal cual desde Supabase.
    unoptimized: true,
  },
  // Ancla la raíz al proyecto: si no, Turbopack encuentra un package-lock.json
  // suelto en el directorio del usuario y avisa en cada build.
  turbopack: { root: import.meta.dirname },
};

export default nextConfig;
