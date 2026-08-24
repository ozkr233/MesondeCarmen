# El Mesón de Carmen

Aplicación de pedidos para el restaurante **El Mesón de Carmen** (Riohacha, La Guajira).
Catálogo dinámico, carrito de compras con checkout por WhatsApp, registro de
pedidos y panel de administración con subida de fotos y métricas.

Next.js 16 (App Router) · React 19 · Tailwind CSS 4 · Supabase (Postgres, Storage y Auth) · Zustand

---

## Puesta en marcha

### 1. Crear el proyecto en Supabase

En [supabase.com](https://supabase.com) crea un proyecto y luego, en
**SQL Editor → New query**, pega y ejecuta el contenido de
[`supabase/schema.sql`](supabase/schema.sql). Eso crea:

- la tabla `dishes` con sus índices (incluye `is_featured`),
- la tabla `settings` con el costo de domicilio,
- las tablas `orders` y `order_items` con sus guardas,
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
> [`03_pedidos.sql`](supabase/03_pedidos.sql) (añade el registro de pedidos) y
> [`04_carta_completa.sql`](supabase/04_carta_completa.sql) (la carta real).
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
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Número del restaurante, sin `+` ni espacios |

### 4. Arrancar

```bash
npm install
npm run dev
```

- Sitio público: <http://localhost:3000>
- Carta completa: <http://localhost:3000/carta>
- Panel: <http://localhost:3000/admin>
- Pedidos: <http://localhost:3000/admin/pedidos>

### 5. Activar la analítica (solo en producción)

El sitio está pensado para desplegarse en Vercel. Después del primer deploy, en
el proyecto de Vercel entra a **Analytics → Enable** y a **Speed Insights →
Enable**: sin ese paso los componentes que ya están en `app/layout.tsx` no
reportan nada.

En desarrollo la analítica no envía datos — los eventos se escriben en la
consola del navegador, que es justo lo que sirve para verificarlos en local.

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

El embudo completo se mide además como eventos en Vercel Analytics:
`carrito_agregado` → `checkout_iniciado` → `pedido_enviado`. Los clics a los
enlaces sueltos de WhatsApp (los que no llevan pedido armado) se registran
aparte como `whatsapp_click`, con el `origen` que los distingue.

## Cómo se administra la carta

Desde `/admin`, sin tocar código:

| Qué | Dónde |
| --- | --- |
| Costo del domicilio | Tarjeta superior. Se suma al total del pedido de WhatsApp; en 0 no se cobra ni se menciona. |
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
lib/analytics.ts           Eventos del embudo (Vercel Analytics)
lib/                       Formato de precios, mensajes de WhatsApp, datos del negocio
proxy.ts                   Protege /admin y refresca la sesión
supabase/schema.sql        Instalación completa desde cero
supabase/02_carta_y_envio.sql  Actualización incremental sobre la v1
supabase/03_pedidos.sql        Actualización incremental: registro de pedidos
supabase/04_carta_completa.sql Carta real del restaurante (32 platos)
assets/Logo.jpeg           Logo original del restaurante (fuente)
public/logo.png            Logo con el fondo recortado, el que usa el sitio
app/icon.png               Favicon · app/opengraph-image.png  Vista previa al compartir
Placeholder.html           Diseño original, conservado como referencia
```

## Notas técnicas

- **`proxy.ts`, no `middleware.ts`**: Next 16 deprecó el nombre `middleware`.
  Misma función, runtime Node.js.
- **Datos del negocio** (dirección, horarios, mapa, foto de portada) están en
  [`lib/site.ts`](lib/site.ts), no repartidos por los componentes.
- **Las fotos se suben desde el navegador** al bucket `menu-images`: el cuerpo
  de una Server Action está limitado a ~1 MB y una foto de plato lo supera.
  Solo la URL pública viaja a la Server Action.
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
  en el servidor (UTC en Vercel); sin fijar la zona, los pedidos hechos después
  de las 7 p.m. contarían como del día siguiente.
- **Las miniaturas del carrito se cargan con `loading="eager"`.** El panel se
  monta dentro de un overlay `fixed` al hacer clic; con el `lazy` que trae
  `next/image` por defecto, el navegador no llegaba a pedirlas y el recuadro
  salía vacío.
- Las imágenes de ejemplo del seed apuntan a un CDN externo con enlaces
  temporales. Súbelas de nuevo desde `/admin` para tener las tuyas propias.
