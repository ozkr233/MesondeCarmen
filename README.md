# El Mesón de Carmen

Aplicación de pedidos para el restaurante **El Mesón de Carmen** (Riohacha, La Guajira).
Catálogo dinámico, carrito de compras con checkout por WhatsApp y panel de
administración con subida de fotos.

Next.js 16 (App Router) · React 19 · Tailwind CSS 4 · Supabase (Postgres, Storage y Auth) · Zustand

---

## Puesta en marcha

### 1. Crear el proyecto en Supabase

En [supabase.com](https://supabase.com) crea un proyecto y luego, en
**SQL Editor → New query**, pega y ejecuta el contenido de
[`supabase/schema.sql`](supabase/schema.sql). Eso crea:

- la tabla `dishes` con sus índices,
- las políticas RLS (lectura pública, escritura solo autenticados),
- el bucket público `menu-images` con sus políticas,
- los tres platos de ejemplo.

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
- Panel: <http://localhost:3000/admin>

---

## Estructura

```
app/
  page.tsx                 Landing + carta (Server Component)
  admin/login/page.tsx     Login contra Supabase Auth
  admin/(panel)/           Dashboard CRUD (protegido)
  admin/actions.ts         Server Actions: crear, editar, borrar, salir
components/
  site/                    Hero, WhyUs, Ubicación, Footer, botones flotantes
  menu/                    Carta agrupada por categoría y tarjeta de plato
  cart/                    Carrito lateral y formulario de checkout
  admin/                   Tabla y formulario de platos
  ui/                      Button, Input, Card, Modal
utils/supabase/            Clientes browser / server / proxy
store/cart.ts              Carrito (Zustand + localStorage)
lib/                       Formato de precios, mensajes de WhatsApp, datos del negocio
proxy.ts                   Protege /admin y refresca la sesión
supabase/schema.sql        SQL para ejecutar en el panel de Supabase
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
- Las imágenes de ejemplo del seed apuntan a un CDN externo con enlaces
  temporales. Súbelas de nuevo desde `/admin` para tener las tuyas propias.
