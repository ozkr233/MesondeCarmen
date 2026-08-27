-- ============================================================================
--  El Mesón de Carmen — Esquema completo de base de datos
--  Ejecutar completo en:  Supabase Dashboard → SQL Editor → New query → Run
--  Es idempotente: puedes volver a ejecutarlo sin romper nada.
--
--  Este archivo instala TODO desde cero (platos, ajustes, pedidos, storage).
--  Si tu proyecto de Supabase ya estaba creado con una versión anterior, corre
--  en su lugar las migraciones incrementales 02_carta_y_envio.sql y
--  03_pedidos.sql, que solo aplican lo que falta.
--
--  Los platos que siembra al final son de EJEMPLO. Para cargar la carta real
--  del restaurante, ejecuta después 04_carta_completa.sql.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 0. Quiénes son administradores
--
--    Tener sesión no basta: hay que estar en esta tabla. La clave es el
--    `user_id` y no el correo, así que cambiar de email en Supabase no hace
--    perder los permisos, y el `on delete cascade` revoca el acceso solo al
--    borrar la cuenta.
--
--    La tabla se queda SIN POLÍTICAS a propósito: con RLS activo y ninguna
--    política, nadie la lee ni la escribe desde el navegador. Si un usuario
--    cualquiera pudiera insertar aquí, se nombraría administrador a sí mismo.
--    Desde el dashboard sí se gestiona: usa la llave secreta, que se salta RLS.
--
--    Ver el archivo 07_rls_solo_admin.sql para dar de alta y de baja.
-- ----------------------------------------------------------------------------
create table if not exists public.admins (
  user_id    uuid        primary key references auth.users (id) on delete cascade,
  note       text,
  created_at timestamptz not null default now()
);

comment on table public.admins is
  'Quién puede administrar. Se gestiona desde el dashboard; el navegador no la ve.';

alter table public.admins enable row level security;
revoke all on public.admins from anon, authenticated;

-- `security definer` no es opcional: la tabla de arriba tiene RLS y ninguna
-- política, así que una función normal no podría leerla y devolvería false para
-- todo el mundo. Al ejecutarse como su dueño salta ese muro, que es justo lo que
-- se busca: leer la lista sin exponerla. No hay recursión posible porque
-- `admins` no tiene políticas que llamen a esta función.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admins where user_id = (select auth.uid())
  )
$$;

comment on function public.is_admin() is
  'Cierto si quien llama está en public.admins. La usan todas las políticas.';

-- El primer administrador. Sin esto, una instalación limpia nace sin nadie que
-- pueda entrar al panel. Cambia el correo por el tuyo antes de ejecutar.
insert into public.admins (user_id, note)
select id, 'Dueño'
from auth.users
where email = 'alefito2012@gmail.com'
on conflict (user_id) do nothing;


-- ----------------------------------------------------------------------------
-- 1. Tabla de platos
-- ----------------------------------------------------------------------------
create table if not exists public.dishes (
  id           uuid          primary key default gen_random_uuid(),
  name         text          not null,
  description  text,
  price        numeric(10,2) not null default 0,
  category     text          not null default 'General',
  image_url    text,
  is_available boolean       not null default true,
  is_featured  boolean       not null default false,
  created_at   timestamptz   not null default now()
);

-- `add column if not exists` para las bases que se crearon antes de que
-- existieran los destacados.
alter table public.dishes
  add column if not exists is_featured boolean not null default false;

create index if not exists dishes_category_idx     on public.dishes (category);
create index if not exists dishes_is_available_idx on public.dishes (is_available);

-- Índice parcial: solo interesan las filas destacadas, que son un puñado.
create index if not exists dishes_is_featured_idx
  on public.dishes (is_featured)
  where is_featured;


-- ----------------------------------------------------------------------------
-- 2. Row Level Security sobre dishes
--    Lectura pública · Escritura solo para el dueño (ver punto 0)
-- ----------------------------------------------------------------------------
alter table public.dishes enable row level security;

drop policy if exists "dishes_select_public"        on public.dishes;
drop policy if exists "dishes_insert_authenticated" on public.dishes;
drop policy if exists "dishes_update_authenticated" on public.dishes;
drop policy if exists "dishes_delete_authenticated" on public.dishes;
drop policy if exists "dishes_insert_admin"         on public.dishes;
drop policy if exists "dishes_update_admin"         on public.dishes;
drop policy if exists "dishes_delete_admin"         on public.dishes;

-- Cualquiera puede leer. Se permite leer también los no disponibles porque el
-- panel /admin usa la misma sesión anónima para el listado inicial; el filtro
-- is_available = true se aplica en la consulta de la vista pública.
create policy "dishes_select_public"
  on public.dishes for select
  to anon, authenticated
  using (true);

create policy "dishes_insert_admin"
  on public.dishes for insert
  to authenticated
  with check (public.is_admin());

create policy "dishes_update_admin"
  on public.dishes for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "dishes_delete_admin"
  on public.dishes for delete
  to authenticated
  using (public.is_admin());


-- ----------------------------------------------------------------------------
-- 3. Ajustes del negocio (una sola fila)
--    El check (id = 1) impide que se creen filas sueltas por error.
-- ----------------------------------------------------------------------------
create table if not exists public.settings (
  id           smallint      primary key default 1 check (id = 1),
  delivery_fee numeric(10,2) not null default 0,
  updated_at   timestamptz   not null default now()
);

insert into public.settings (id) values (1)
on conflict (id) do nothing;

alter table public.settings enable row level security;

drop policy if exists "settings_select_public"        on public.settings;
drop policy if exists "settings_update_authenticated" on public.settings;
drop policy if exists "settings_update_admin"         on public.settings;

create policy "settings_select_public"
  on public.settings for select
  to anon, authenticated
  using (true);

create policy "settings_update_admin"
  on public.settings for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());


-- ----------------------------------------------------------------------------
-- 4. Pedidos
--    `total` es una columna generada: no puede quedar descuadrada del subtotal.
-- ----------------------------------------------------------------------------
create table if not exists public.orders (
  id               uuid          primary key default gen_random_uuid(),
  code             text          not null,
  customer_name    text          not null,
  customer_phone   text          not null,
  customer_address text          not null,
  notes            text,
  -- Cómo paga: valor interno del formulario, no la etiqueta que ve el cliente.
  -- `cash_bill` distingue null (no aplica) de 0 (paga con el valor exacto).
  payment_method   text,
  cash_bill        numeric(12,2),
  subtotal         numeric(12,2) not null default 0,
  delivery_fee     numeric(12,2) not null default 0,
  total            numeric(12,2) generated always as (subtotal + delivery_fee) stored,
  status           text          not null default 'pendiente'
                     check (status in ('pendiente','confirmado','entregado','cancelado')),
  created_at       timestamptz   not null default now()
);

create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists orders_status_idx     on public.orders (status);
create index if not exists orders_code_idx       on public.orders (code);


-- ----------------------------------------------------------------------------
-- 5. Guardas sobre orders
--    La política de insert es pública (ver punto 7): cualquiera puede escribir
--    contra PostgREST sin pasar por el formulario. Estos checks acotan el daño
--    a filas con forma razonable; la validación de verdad vive en la Server
--    Action `saveOrder`, que además recalcula los precios contra `dishes`.
--    `drop` + `add` en vez de `if not exists`, que Postgres no soporta aquí.
-- ----------------------------------------------------------------------------
alter table public.orders drop constraint if exists orders_code_len;
alter table public.orders drop constraint if exists orders_customer_name_len;
alter table public.orders drop constraint if exists orders_customer_phone_len;
alter table public.orders drop constraint if exists orders_customer_address_len;
alter table public.orders drop constraint if exists orders_notes_len;
alter table public.orders drop constraint if exists orders_subtotal_positive;
alter table public.orders drop constraint if exists orders_delivery_fee_positive;
alter table public.orders drop constraint if exists orders_payment_method_valid;
alter table public.orders drop constraint if exists orders_cash_bill_valid;

alter table public.orders
  add constraint orders_code_len
    check (length(code) between 1 and 20),
  add constraint orders_customer_name_len
    check (length(btrim(customer_name)) between 1 and 120),
  add constraint orders_customer_phone_len
    check (length(btrim(customer_phone)) between 1 and 40),
  add constraint orders_customer_address_len
    check (length(btrim(customer_address)) between 1 and 300),
  add constraint orders_notes_len
    check (notes is null or length(notes) <= 500),
  add constraint orders_subtotal_positive
    check (subtotal >= 0),
  add constraint orders_delivery_fee_positive
    check (delivery_fee >= 0),
  add constraint orders_payment_method_valid
    check (payment_method is null
           or payment_method in ('efectivo','transferencia','breb')),
  add constraint orders_cash_bill_valid
    check (cash_bill is null or cash_bill >= 0);


-- ----------------------------------------------------------------------------
-- 6. Líneas del pedido
--    El nombre y el precio se guardan copiados: si mañana sube el precio o se
--    borra el plato, el histórico tiene que seguir contando lo que se cobró.
-- ----------------------------------------------------------------------------
create table if not exists public.order_items (
  id         uuid          primary key default gen_random_uuid(),
  order_id   uuid          not null references public.orders (id) on delete cascade,
  dish_id    uuid          references public.dishes (id) on delete set null,
  name       text          not null,
  unit_price numeric(10,2) not null default 0,
  quantity   integer       not null default 1 check (quantity > 0)
);

create index if not exists order_items_order_id_idx on public.order_items (order_id);
create index if not exists order_items_dish_id_idx  on public.order_items (dish_id);

alter table public.order_items drop constraint if exists order_items_name_len;
alter table public.order_items drop constraint if exists order_items_unit_price_positive;
alter table public.order_items drop constraint if exists order_items_quantity_max;

alter table public.order_items
  add constraint order_items_name_len
    check (length(btrim(name)) between 1 and 200),
  add constraint order_items_unit_price_positive
    check (unit_price >= 0),
  add constraint order_items_quantity_max
    check (quantity <= 99);


-- ----------------------------------------------------------------------------
-- 7. RLS sobre los pedidos
--    Nadie escribe pedidos desde el navegador. No hay política de INSERT: los
--    registra la Server Action `saveOrder` con la llave secreta, que se salta
--    RLS. Así, releer los precios de `dishes` antes de guardar deja de ser una
--    convención del formulario y pasa a ser la única puerta que existe.
--
--    LEERLOS es solo para el dueño, y eso significa la cuenta concreta que
--    define `is_admin()` en el punto 0, no cualquiera que tenga sesión:
--    contienen nombre, teléfono y dirección de los clientes.
-- ----------------------------------------------------------------------------
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;

drop policy if exists "orders_insert_public"         on public.orders;
drop policy if exists "orders_select_authenticated"  on public.orders;
drop policy if exists "orders_update_authenticated"  on public.orders;
drop policy if exists "orders_delete_authenticated"  on public.orders;
drop policy if exists "orders_select_admin"          on public.orders;
drop policy if exists "orders_update_admin"          on public.orders;
drop policy if exists "orders_delete_admin"          on public.orders;

-- El `revoke` es redundante con la ausencia de política: deja la intención
-- escrita también en los permisos, no solo en las reglas de RLS.
revoke insert on public.orders from anon, authenticated;

create policy "orders_select_admin"
  on public.orders for select
  to authenticated
  using (public.is_admin());

create policy "orders_update_admin"
  on public.orders for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "orders_delete_admin"
  on public.orders for delete
  to authenticated
  using (public.is_admin());

drop policy if exists "order_items_insert_public"        on public.order_items;
drop policy if exists "order_items_select_authenticated" on public.order_items;
drop policy if exists "order_items_delete_authenticated" on public.order_items;
drop policy if exists "order_items_select_admin"         on public.order_items;
drop policy if exists "order_items_delete_admin"         on public.order_items;

revoke insert on public.order_items from anon, authenticated;

create policy "order_items_select_admin"
  on public.order_items for select
  to authenticated
  using (public.is_admin());

create policy "order_items_delete_admin"
  on public.order_items for delete
  to authenticated
  using (public.is_admin());


-- ----------------------------------------------------------------------------
-- 8. Bucket de Storage para las fotos de los platos
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('menu-images', 'menu-images', true)
on conflict (id) do nothing;


-- ----------------------------------------------------------------------------
-- 9. RLS sobre las imágenes del bucket
-- ----------------------------------------------------------------------------
drop policy if exists "menu_images_select_public"        on storage.objects;
drop policy if exists "menu_images_insert_authenticated" on storage.objects;
drop policy if exists "menu_images_update_authenticated" on storage.objects;
drop policy if exists "menu_images_delete_authenticated" on storage.objects;
drop policy if exists "menu_images_insert_admin"         on storage.objects;
drop policy if exists "menu_images_update_admin"         on storage.objects;
drop policy if exists "menu_images_delete_admin"         on storage.objects;

create policy "menu_images_select_public"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'menu-images');

create policy "menu_images_insert_admin"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'menu-images' and public.is_admin());

create policy "menu_images_update_admin"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'menu-images' and public.is_admin())
  with check (bucket_id = 'menu-images' and public.is_admin());

create policy "menu_images_delete_admin"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'menu-images' and public.is_admin());


-- ----------------------------------------------------------------------------
-- 10. Platos destacados de la portada (solo si la tabla está vacía)
--     Los precios y las fotos son de ejemplo: edítalos desde el panel /admin.
-- ----------------------------------------------------------------------------
insert into public.dishes (name, description, price, category, image_url, is_available, is_featured)
select *
from (
  values
    (
      'Arroz de Camarón',
      'Arroz colorado, lleno de sabor caribeño, preparado con camarones frescos y especias de la región. Ideal para compartir.',
      35000::numeric, 'Platos Fuertes',
      'https://z-cdn-media.chatglm.cn/files/618438aa-692a-41ff-aa52-46821d36a49d.jpeg?auth_key=1885199246-fe9d77de764141fabf8ae1c90e3e5f4a-0-0becbdcf641017680cd84cf9bf071961',
      true, true
    ),
    (
      'Cerdo Guisado',
      'Cerdo cocinado a fuego lento en salsa tradicional, acompañado de arroz, patacón y ensalada. El sabor de la comida casera.',
      28000::numeric, 'Platos Fuertes',
      'https://z-cdn-media.chatglm.cn/files/30c2c83d-5f93-4ecb-9c01-7293b51113ab.jpeg?auth_key=1885199246-4bab8becbfbc4e2e8b5f89922da564bf-0-a622ca86799c86369ae175cf0eaa8b55',
      true, true
    ),
    (
      'Pescado Frito',
      'Fresco del día, frito hasta quedar dorado y crujiente, con el toque ahumado de la leña. Acompañado de patacones.',
      32000::numeric, 'Platos Fuertes',
      'https://z-cdn-media.chatglm.cn/files/37be5711-877c-4a2c-abb2-5b2aa99f4bcb.jpeg?auth_key=1885199246-2b36e3d08de6479186887b4085aba50b-0-f79089dbac91562f4b023121000b1fc5',
      true, true
    )
) as seed(name, description, price, category, image_url, is_available, is_featured)
where not exists (select 1 from public.dishes);


-- ----------------------------------------------------------------------------
-- 11. Resto de la carta de ejemplo, para que no nazca con tres platos
--     Cada uno se inserta únicamente si no existe ya un plato con ese nombre.
-- ----------------------------------------------------------------------------
insert into public.dishes (name, description, price, category)
select seed.*
from (
  values
    ('Empanadas de Carne',  'Tres empanadas crujientes recién fritas, con ají casero.',                     8000::numeric,  'Entradas'),
    ('Patacón con Queso',   'Plátano verde aplastado y frito, cubierto con queso costeño.',                 9000::numeric,  'Entradas'),
    ('Sancocho de Gallina', 'Sopa espesa de gallina criolla con yuca, plátano y ñame. Sirve para dos.',      30000::numeric, 'Sopas'),
    ('Limonada de Panela',  'Limonada natural endulzada con panela, bien fría.',                            5000::numeric,  'Bebidas'),
    ('Jugo de Corozo',      'Jugo natural de corozo, el sabor de la Guajira.',                              6000::numeric,  'Bebidas'),
    ('Gaseosa Personal',    'Botella personal. Consulta los sabores disponibles.',                          4000::numeric,  'Bebidas'),
    ('Arroz de Leche',      'Postre tradicional cremoso con canela.',                                       6000::numeric,  'Postres')
) as seed(name, description, price, category)
where not exists (
  select 1 from public.dishes d where d.name = seed.name
);
