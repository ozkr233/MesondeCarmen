import Image from "next/image";

/**
 * Logo del restaurante.
 *
 * El `alt` va vacío a propósito: en todos los sitios donde se usa, el nombre
 * del restaurante está justo al lado como texto, y un alt con el nombre haría
 * que un lector de pantalla lo repitiera dos veces.
 *
 * Usa `logo.webp` (256 px, ~22 KB) en vez de `logo.png` (512 px, 364 KB): sin
 * la optimización de Vercel la imagen se sirve tal cual, y 256 px cubren a 2×
 * el tamaño más grande al que se muestra.
 */
export function Logo({
  size = 40,
  className,
  priority = false,
}: {
  size?: number;
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src="/logo.webp"
      alt=""
      width={size}
      height={size}
      priority={priority}
      className={className}
    />
  );
}
