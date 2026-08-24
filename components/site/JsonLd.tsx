/**
 * Datos estructurados (JSON-LD) para Google.
 *
 * Va como <script> nativo y no con next/script: esto no es código que se
 * ejecute, es contenido que el crawler lee del HTML.
 *
 * El escape de "<" no es decorativo: los nombres y descripciones de los platos
 * los escribe el dueño desde /admin y entran aquí sin filtrar, así que un "<"
 * suelto podría cerrar el script e inyectar HTML en la página.
 */
export function JsonLd({ schema }: { schema: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(schema).replace(/</g, "\u003c"),
      }}
    />
  );
}
