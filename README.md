# El Mesón de Carmen

Aplicación de pedidos para el restaurante **El Mesón de Carmen** (Riohacha, La Guajira).
Catálogo dinámico, carrito de compras con checkout por WhatsApp, registro de
pedidos y panel de administración con subida de fotos y métricas.

Next.js 16 (App Router) · React 19 · Tailwind CSS 4 · Supabase (Postgres, Storage y Auth) · Zustand ·
Cloudflare Workers (vía OpenNext)

---

## Puesta en marcha

### 1. Crear el proyecto en Supabase

En [supabase.com](https://supabase.com) crea un proyecto y luego, en
**SQL Editor → New query**, pega y ejecuta el contenido de
[`supabase/schema.sql`](supabase/schema.sql). Eso crea:

- la tabla `dishes` con sus índices (incluye `is_featured`),
- la tabla `settings` con el costo de domicilio,
- las tablas `orders` y `order_items` con sus guardas,
- la tabla `events` con los eventos del embudo, que alimenta `/admin/pedidos`,
- las políticas RLS (lectura pública, escritura solo autenticados; los pedidos
  los puede crear cualquiera pero solo el dueño los lee),
- el bucket público `menu-images` con sus políticas,
- una carta de ejemplo (entradas, bebidas y postres).

Después ejecuta [`supabase/04_carta_completa.sql`](supabase/04_carta_completa.sql),
que carga la carta real del restaurante: 32 platos con sus precios, agrupados en
Arroces, Asados, Guisados, Fritos, Especialidades Guajiras y Sopas. Actualiza
los platos que ya existan por nombre y respeta las descripciones y fotos que
hayas puesto desde `/admin`.

> **¿Ya tenías una versión anterior instalada?** No corras `schema.sql`:
> ejecuta las migraciones incrementales que te falten, en orden —
> [`02_carta_y_envio.sql`](supabase/02_carta_y_envio.sql) (añade `is_featured`,
> `settings` y el resto de la carta de ejemplo),
> [`03_pedidos.sql`](supabase/03_pedidos.sql) (añade el registro de pedidos),
> [`04_carta_completa.sql`](supabase/04_carta_completa.sql) (la carta real) y
> [`09_porciones.sql`](supabase/09_porciones.sql) (porciones por plato; va
> después de la carta real, que es de donde saca los arroces) y
> [`10_orden_portada.sql`](supabase/10_orden_portada.sql) (orden de los
> destacados) y
> [`11_formulario_pedido.sql`](supabase/11_formulario_pedido.sql) (interruptor
> del formulario de pedido) y
> [`12_eventos.sql`](supabase/12_eventos.sql) (eventos del embudo, que
> reemplazan a Vercel Analytics).
> Todos los archivos son idempotentes: se pueden volver a ejecutar sin romper
> nada.

### 2. Crear el usuario administrador

**Authentication → Users → Add user**. Marca *Auto Confirm User* para poder
entrar de inmediato. Ese correo y contraseña son los del panel `/admin`.

### 3. Configurar las variables de entorno

```bash
cp .env.example .env.local
```

Rellena en `.env.local`:

| Variable | Dónde encontrarla |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → Data API → Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Project Settings → API Keys → Publishable key (`sb_publishable_…`). Si tu proyecto todavía muestra la llave `anon`, sirve igual. |
| `SUPABASE_SECRET_KEY` | Project Settings → API Keys → Secret keys (`sb_secret_…`). **Sin el prefijo `NEXT_PUBLIC_`**: se salta RLS y solo la usa el servidor para registrar pedidos. |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | *Opcional.* Pisa el número de `lib/site.ts` para apuntar un preview a un teléfono de pruebas. Sin `+` ni espacios. |
| `NEXT_PUBLIC_CF_BEACON_TOKEN` | *Opcional.* Token de Cloudflare Web Analytics (ver [Despliegue en Cloudflare](#despliegue-en-cloudflare)). Sin él no se carga el script. |

> La llave secreta no va en git ni en el navegador. En producción va como
> **Secret** del Worker de Cloudflare; ver
> [Despliegue en Cloudflare](#despliegue-en-cloudflare).

> **¿Cambió el teléfono del negocio?** No es una variable de entorno: se edita
> `phoneDisplay` y `phoneE164` en [`lib/site.ts`](lib/site.ts) y se despliega.
> De ahí salen a la vez el número visible, el de los datos estructurados que lee
> Google y el de los enlaces de WhatsApp.

### 4. Arrancar

```bash
npm install
npm run dev
```

- Sitio público: <http://localhost:3000>
- Carta completa: <http://localhost:3000/carta>
- Panel: <http://localhost:3000/admin>
- Pedidos: <http://localhost:3000/admin/pedidos>

### 5. Analítica

Hay dos piezas, y ninguna envía nada en desarrollo:

- **Visitas y Core Web Vitals**: Cloudflare Web Analytics. Solo se carga si
  existe `NEXT_PUBLIC_CF_BEACON_TOKEN` (cómo sacarlo, en el paso 6 del
  despliegue).
- **Eventos del embudo** (agregar al carrito, abrir el formulario, enviar el
  pedido, clics a WhatsApp): se guardan en la tabla `events` de Supabase y se
  ven en `/admin/pedidos`. En `npm run dev` no se mandan: se escriben en la
  consola del navegador, que es justo lo que sirve para verificarlos en local
  sin ensuciar las cifras de producción.

---

## Despliegue en Cloudflare

El sitio corre en **Cloudflare Workers** con el adaptador
[OpenNext](https://opennext.js.org/cloudflare). Se compila con el
`next build` de siempre, y `opennextjs-cloudflare` lo empaqueta como Worker.
La configuración está en [`wrangler.jsonc`](wrangler.jsonc) y
[`open-next.config.ts`](open-next.config.ts).

### Primera vez

1. **Base de datos.** Ejecuta [`supabase/12_eventos.sql`](supabase/12_eventos.sql)
   en el SQL Editor (si instalaste desde cero con `schema.sql`, ya está).
2. **Crear el Worker conectado a GitHub.** En Cloudflare, **Workers & Pages →
   Create → Import a repository** y elige este repositorio:
   - **Project name**: `mesondecarmen`. Tiene que ser igual al `name` de
     `wrangler.jsonc`.
   - **Build command**: `npx opennextjs-cloudflare build`
   - **Deploy command**: `npx opennextjs-cloudflare deploy`
   - **Non-production branch deploy command**: `npx opennextjs-cloudflare upload`
     (las otras ramas quedan como versiones de prueba con su propia URL, sin
     tocar producción).
3. **Variables de build** (Settings → Build → *Variables and secrets*). Las
   `NEXT_PUBLIC_*` se copian dentro del código al compilar, así que tienen que
   existir en el build:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `NEXT_PUBLIC_CF_BEACON_TOKEN` (opcional, paso 6)
4. **Secret de runtime** (Settings → *Variables and Secrets* → Add → tipo
   **Secret**): `SUPABASE_SECRET_KEY`. No la pongas como variable de build ni
   con el prefijo `NEXT_PUBLIC_`. Como es un Secret, los deploys no la borran.
5. **Probar** en `https://mesondecarmen.<tu-subdominio>.workers.dev`: la carta
   con fotos, el carrito, un pedido de prueba (tiene que aparecer en
   `/admin/pedidos`), entrar a `/admin` y subir una foto. El `proxy.ts`, que
   protege `/admin` y refresca la sesión, usa un soporte que OpenNext todavía
   marca como experimental: si `/admin` no redirige al login o la sesión se
   cae, **no muevas el dominio** todavía.
6. **Web Analytics.** Cloudflare → **Analytics & Logs → Web Analytics → Add a
   site** → `mesondecarmen.com`. Si te ofrece la instalación automática (pasa
   cuando el dominio ya está en Cloudflare), puedes usarla y no poner el token.
   Si no, copia el `token` del snippet, ponlo como `NEXT_PUBLIC_CF_BEACON_TOKEN`
   en las variables de build y vuelve a desplegar. Usa una de las dos opciones,
   no ambas, o cada visita contaría doble.
7. **Dominio.**
   - Si el DNS de `mesondecarmen.com` todavía no está en Cloudflare: **Add a
     domain**, plan Free, y cambia los nameservers en el registrador donde
     compraste el dominio (puede tardar unas horas).
   - En el Worker: **Settings → Domains & Routes → Add → Custom domain** →
     `mesondecarmen.com` y `www.mesondecarmen.com`. Si quedan registros `A` o
     `CNAME` apuntando a Vercel, bórralos antes: Cloudflare no deja crear el
     dominio encima de ellos.
   - Opcional: **Rules → Redirect Rules**, con la plantilla de `www` al dominio
     raíz, para que solo exista una versión del sitio.
8. **Apagar Vercel**, cuando el dominio ya responda desde Cloudflare: quita el
   dominio del proyecto y desconecta el repositorio (Settings → Git) o borra el
   proyecto. Hasta entonces cada push se despliega en los dos sitios, y no pasa
   nada.

### A tener en cuenta

- **Plan Free o Paid.** El plan Free de Workers permite un Worker de hasta
  3 MiB comprimido, 10 ms de CPU por petición y 100.000 peticiones al día.
  Este sitio pesa ~2,7 MiB comprimido (medido con
  `npx wrangler deploy --dry-run`), así que cabe, pero con poco margen. Si el
  deploy falla por tamaño, o en los logs del Worker aparecen errores `1102`
  (CPU agotada), hace falta Workers Paid (USD 5 al mes: 10 MiB y hasta 30 s de
  CPU).
- **No despliegues desde tu PC** con `npm run deploy`. El build lee
  `.env.local` y OpenNext copia esos valores, incluida la llave secreta, dentro
  del código del Worker (`.open-next/cloudflare/next-env.mjs`). No llegan al
  navegador, pero quedan en el código subido. Desde Workers Builds no existe
  `.env.local` y la llave sale del Secret.
- **Windows.** OpenNext no garantiza que funcione en Windows. Hoy el build y
  `npm run preview` (el Worker en local, en <http://localhost:8787>) funcionan
  en Windows; si algún día fallan, usa WSL. `npm run dev` sigue siendo el
  de siempre.
- **Después de cambiar dependencias, `npm run lock`.** Workers Builds instala
  con `npm ci` y npm 10.9.2 (no se puede elegir la versión). Un `npm install`
  con npm 11 en Windows borra del `package-lock.json` unas dependencias
  opcionales de wasm (`@emnapi/core`, `@emnapi/runtime`), y npm 10 rechaza
  entonces el lockfile ("Missing: @emnapi/… from lock file"). `npm run lock`
  lo regenera con npm 10.9.2 sin tocar `node_modules`. Si se te olvida, el build
  falla y producción se queda en la versión anterior: no se rompe nada.
- **Logs.** Worker → **Observability**. Están activados en `wrangler.jsonc`.
- **Sin ISR ni optimización de imágenes en el servidor.** La portada y la carta
  se renderizan en cada visita, y las fotos llegan ya comprimidas desde
  Supabase (ver Notas técnicas). Por eso no hacen falta ni R2 ni el binding
  `IMAGES`.

---

## Cómo saber si un pedido salió de la página

Cada pedido enviado desde el sitio se guarda en Supabase y recibe un código
corto (`MC-4F7K2`) que va también en el mensaje de WhatsApp, justo debajo del
encabezado. Si el mensaje trae código, salió de la página y está en
`/admin/pedidos`; si no lo trae, llegó por otro canal.

En `/admin/pedidos` el dueño ve el listado con el detalle de cada pedido y las
métricas de los últimos 30 días (pedidos por período, ingresos, ticket promedio
y platos más vendidos). El estado del pedido se muestra pero todavía no se
puede cambiar desde el panel.

Los precios **no se toman del carrito del visitante**: la Server Action
`saveOrder` vuelve a leerlos de `dishes` antes de guardar, así un carrito
manipulado en `localStorage` no puede ensuciar las cifras. Si Supabase falla o
tarda más de 3 segundos, WhatsApp se abre igual y el pedido sale sin código:
perder el registro es un problema, perder la venta es peor.

El embudo completo se registra además como eventos en la tabla `events`
(`carrito_agregado` → `checkout_iniciado` → `pedido_enviado`), y `/admin/pedidos`
muestra los totales de los últimos 30 días. Los clics a los enlaces sueltos de
WhatsApp (los que no llevan pedido armado) van aparte como `whatsapp_click`,
con el `origen` que los distingue, y las llegadas por un enlace compartido de
plato, como `carrito_deeplink`. Los eventos cuentan clics, no visitantes, y no
guardan nada de quien los hace.

Los manda `trackEvent` ([`lib/analytics.ts`](lib/analytics.ts)) con
`sendBeacon` a [`/api/events`](app/api/events/route.ts), que valida cada uno
con [`lib/events.ts`](lib/events.ts) y lo escribe con la llave secreta: igual
que los pedidos, la tabla no acepta escrituras desde el navegador.

## Cómo se administra la carta

Desde `/admin`, sin tocar código:

| Qué | Dónde |
| --- | --- |
| Costo del domicilio | Tarjeta superior. Se suma al total del pedido de WhatsApp; en 0 no se cobra ni se menciona. |
| Formulario de pedido | Interruptor bajo el domicilio. Apagado, el carrito manda directo los platos y el total a WhatsApp, sin pedir nombre, teléfono ni dirección; el pedido igual queda en `/admin/pedidos`, sin datos del cliente. |
| Disponibilidad | Interruptor verde. Un plato agotado desaparece de la portada y de `/carta`. |
| Platos de la portada | Interruptor dorado. La landing muestra los 3 destacados más antiguos; el resto de la carta vive en `/carta`. |
| Precios, fotos y categorías | Botón de editar. La categoría es texto libre con sugerencias. |

El orden de las categorías en la carta lo fija `CATEGORY_ORDER` en
[lib/site.ts](lib/site.ts); las categorías nuevas que no estén ahí salen al
final, en orden alfabético.

---

## Estructura

```
app/
  page.tsx                 Landing con los 3 destacados (Server Component)
  carta/page.tsx           Carta completa por categorías
  admin/login/page.tsx     Login contra Supabase Auth
  admin/(panel)/           Dashboard CRUD + costo de envío (protegido)
  admin/(panel)/pedidos/   Listado de pedidos y métricas
  admin/actions.ts         Server Actions: crear, editar, borrar, interruptores, envío
  actions/orders.ts        Server Action pública que registra el pedido
  api/events/route.ts      Recibe los eventos del embudo y los guarda en Supabase
  sitemap.ts               /sitemap.xml para Google
  robots.ts                /robots.txt (bloquea /admin, apunta al sitemap)
  admin/layout.tsx         Solo marca todo /admin como noindex
components/
  site/                    Hero, WhyUs, Ubicación, Footer, cabecera, botones flotantes
  menu/                    Carta agrupada, navegación de categorías, tarjeta de plato
  cart/                    Carrito lateral, totales y formulario de checkout
  admin/                   Tabla y formulario de platos, envío, pedidos y métricas
  ui/                      Button, Input, Card, Modal, Switch
utils/supabase/            Clientes browser / server / proxy
store/cart.ts              Carrito (Zustand + localStorage)
lib/queries.ts             Consultas de lectura de platos y ajustes
lib/orders.ts              Consultas de pedidos y estadísticas del panel
lib/analytics.ts           trackEvent: manda los eventos del embudo a /api/events
lib/events.ts              Qué eventos existen y cómo se validan
lib/seo.ts                 URL pública y datos estructurados (JSON-LD)
lib/                       Formato de precios, mensajes de WhatsApp, datos del negocio
proxy.ts                   Protege /admin y refresca la sesión
wrangler.jsonc             Worker de Cloudflare (nombre, flags, assets)
open-next.config.ts        Adaptador OpenNext (caché de solo lectura, sin ISR)
public/_headers            Caché larga para /_next/static en Cloudflare
supabase/schema.sql        Instalación completa desde cero
supabase/02_carta_y_envio.sql  Actualización incremental sobre la v1
supabase/03_pedidos.sql        Actualización incremental: registro de pedidos
supabase/04_carta_completa.sql Carta real del restaurante (32 platos)
supabase/09_porciones.sql      Actualización incremental: porciones y sus precios
supabase/10_orden_portada.sql  Actualización incremental: orden de los destacados
supabase/11_formulario_pedido.sql Actualización incremental: formulario de pedido opcional
supabase/12_eventos.sql        Actualización incremental: eventos del embudo
lib/portions.ts                Porciones: precios por tamaño y precio de la carta
assets/Logo.jpeg           Logo original del restaurante (fuente)
public/logo.png            Logo con el fondo recortado (512 px, el del JSON-LD)
public/logo.webp           El mismo a 256 px, el que muestra el sitio
app/icon.png               Favicon · app/opengraph-image.png  Vista previa al compartir
Placeholder.html           Diseño original, conservado como referencia
```

## SEO

Todo lo técnico ya está en el código y se regenera solo en cada deploy:

| Qué | Dónde |
| --- | --- |
| `sitemap.xml` con `/` y `/carta` | [app/sitemap.ts](app/sitemap.ts) |
| `robots.txt` (bloquea `/admin`) | [app/robots.ts](app/robots.ts) |
| Título, descripción, Open Graph, canonical | [app/layout.tsx](app/layout.tsx) y el `metadata` de cada página |
| Ficha del negocio y carta para Google (JSON-LD) | [lib/seo.ts](lib/seo.ts) |

Los datos que ve Google (dirección, teléfono, horarios, redes) salen de `site`
en [lib/site.ts](lib/site.ts): **si cambia el horario o el teléfono, se cambia
ahí y se actualizan a la vez la página y los datos estructurados.** El horario
está dos veces en ese archivo a propósito — `hours` es el texto que lee el
cliente y `openingHours` el que lee Google; hay que tocar los dos.

Pendientes que no se resuelven desde el código:

1. En **Search Console → Sitemaps**, enviar `sitemap.xml` una vez tras el
   primer deploy con estos cambios.
2. Rellenar `site.sameAs` con la URL del perfil de Google Business y las redes,
   para que Google confirme que la web y la ficha del negocio son lo mismo.
3. Reemplazar la foto del hero por una propia alojada en el proyecto: hoy viene
   de un CDN externo con una clave que puede caducar, y al ser un fondo de CSS
   no se optimiza — es lo más pesado de la portada y eso puntúa en el ranking.

## Notas técnicas

- **`proxy.ts`, no `middleware.ts`**: Next 16 deprecó el nombre `middleware`.
  Misma función, runtime Node.js.
- **Datos del negocio** (dirección, horarios, mapa, foto de portada) están en
  [`lib/site.ts`](lib/site.ts), no repartidos por los componentes.
- **Las fotos se suben desde el navegador** al bucket `menu-images`: el cuerpo
  de una Server Action está limitado a ~1 MB y una foto de plato lo supera.
  Solo la URL pública viaja a la Server Action.
- **Las fotos no pasan por la optimización de Vercel** (`images.unoptimized`
  en [`next.config.ts`](next.config.ts)). Cada ancho de cada foto contaba como
  una transformación, el cupo de Hobby se agotó y las fotos nuevas daban 402.
  En su lugar se achican una sola vez, en el navegador, antes de subirlas
  ([`lib/compress-image.ts`](lib/compress-image.ts): WebP, lado mayor de
  1200 px, ~100 KB), y se sirven tal cual desde Supabase con caché de un año.
  Las que se subieron antes de este cambio se recomprimen con:

  ```bash
  node --env-file=.env.local scripts/optimizar-imagenes.mts            # informe
  node --env-file=.env.local scripts/optimizar-imagenes.mts --aplicar  # ejecutar
  ```
- **La seguridad real es RLS.** El proxy redirige, pero cada Server Action
  revalida la sesión por su cuenta porque el matcher del proxy no cubre de
  forma fiable las Server Actions.
- **La pestaña de WhatsApp se abre en blanco y se navega después.** El pedido
  se guarda antes de mandar el mensaje, pero `window.open` tiene que llamarse
  de forma síncrona dentro del `submit` o el navegador lo bloquea como popup.
  Por eso se abre `about:blank` de inmediato y se le asigna la URL cuando el
  guardado responde. Va sin `noopener`: esa opción devuelve `null` y se
  perdería la referencia a la pestaña.
- **Las horas del panel van fijas a `America/Bogota`.** El panel se renderiza
  en el servidor (que corre en UTC); sin fijar la zona, los pedidos hechos después
  de las 7 p.m. contarían como del día siguiente.
- **Las miniaturas del carrito se cargan con `loading="eager"`.** El panel se
  monta dentro de un overlay `fixed` al hacer clic; con el `lazy` que trae
  `next/image` por defecto, el navegador no llegaba a pedirlas y el recuadro
  salía vacío.
- Las imágenes de ejemplo del seed apuntan a un CDN externo con enlaces
  temporales. Súbelas de nuevo desde `/admin` para tener las tuyas propias.
