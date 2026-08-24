import { WhatsAppLink } from "@/components/site/WhatsAppLink";
import { site } from "@/lib/site";

export function LocationSection() {
  return (
    <section id="ubicacion" className="bg-white py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-12 text-center">
          <h2 className="mb-3 text-4xl font-bold text-primary">
            Ven y Come con Nosotros
          </h2>
          <p className="text-lg text-dark/60">
            Ubicados en el corazón de Riohacha. Te esperamos con el fuego
            encendido.
          </p>
        </div>

        <div className="grid items-center gap-10 md:grid-cols-2">
          <div className="h-96 overflow-hidden rounded-lg shadow-lg">
            <iframe
              src={site.mapsEmbedUrl}
              title={`Ubicación de ${site.name}`}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>

          <div className="space-y-6">
            <InfoBlock title="📍 Dirección">
              <p className="text-lg text-dark/70">{site.address}</p>
            </InfoBlock>

            <InfoBlock title="🕒 Horarios">
              <ul className="text-lg text-dark/70">
                {site.hours.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </InfoBlock>

            <InfoBlock title="📞 Pide Domicilio">
              <WhatsAppLink
                origen="ubicacion"
                className="text-lg font-bold text-whatsapp-dark hover:underline"
              >
                {site.phoneDisplay}
              </WhatsAppLink>
            </InfoBlock>
          </div>
        </div>
      </div>
    </section>
  );
}

function InfoBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border-l-4 border-secondary bg-light p-6">
      <h3 className="mb-2 text-2xl font-bold text-dark">{title}</h3>
      {children}
    </div>
  );
}
