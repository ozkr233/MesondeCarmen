import Image from "next/image";

/**
 * Logo del restaurante.
 *
 * El `alt` va vacío a propósito: en todos los sitios donde se usa, el nombre
 * del restaurante está justo al lado como texto, y un alt con el nombre haría
 * que un lector de pantalla lo repitiera dos veces.
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
      src="/logo.png"
      alt=""
      width={size}
      height={size}
      priority={priority}
      className={className}
    />
  );
}
