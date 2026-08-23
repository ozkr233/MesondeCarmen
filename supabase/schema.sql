-- ============================================================================
--  El Mesón de Carmen — Esquema de base de datos
--  Ejecutar completo en:  Supabase Dashboard → SQL Editor → New query → Run
--  Es idempotente: puedes volver a ejecutarlo sin romper nada.
-- ============================================================================


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
  created_at   timestamptz   not null default now()
);

create index if not exists dishes_category_idx     on public.dishes (category);
create index if not exists dishes_is_available_idx on public.dishes (is_available);


-- ----------------------------------------------------------------------------
-- 2. Row Level Security sobre dishes
--    Lectura pública · Escritura solo para usuarios autenticados
-- ----------------------------------------------------------------------------
alter table public.dishes enable row level security;

drop policy if exists "dishes_select_public"        on public.dishes;
drop policy if exists "dishes_insert_authenticated" on public.dishes;
drop policy if exists "dishes_update_authenticated" on public.dishes;
drop policy if exists "dishes_delete_authenticated" on public.dishes;

-- Cualquiera puede leer. Se permite leer también los no disponibles porque el
-- panel /admin usa la misma sesión anónima para el listado inicial; el filtro
-- is_available = true se aplica en la consulta de la vista pública.
create policy "dishes_select_public"
  on public.dishes for select
  to anon, authenticated
  using (true);

create policy "dishes_insert_authenticated"
  on public.dishes for insert
  to authenticated
  with check (true);

create policy "dishes_update_authenticated"
  on public.dishes for update
  to authenticated
  using (true)
  with check (true);

create policy "dishes_delete_authenticated"
  on public.dishes for delete
  to authenticated
  using (true);


-- ----------------------------------------------------------------------------
-- 3. Bucket de Storage para las fotos de los platos
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('menu-images', 'menu-images', true)
on conflict (id) do nothing;


-- ----------------------------------------------------------------------------
-- 4. RLS sobre las imágenes del bucket
-- ----------------------------------------------------------------------------
drop policy if exists "menu_images_select_public"        on storage.objects;
drop policy if exists "menu_images_insert_authenticated" on storage.objects;
drop policy if exists "menu_images_update_authenticated" on storage.objects;
drop policy if exists "menu_images_delete_authenticated" on storage.objects;

create policy "menu_images_select_public"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'menu-images');

create policy "menu_images_insert_authenticated"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'menu-images');

create policy "menu_images_update_authenticated"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'menu-images')
  with check (bucket_id = 'menu-images');

create policy "menu_images_delete_authenticated"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'menu-images');


-- ----------------------------------------------------------------------------
-- 5. Datos iniciales (solo si la tabla está vacía)
--    Los precios son de ejemplo: edítalos desde el panel /admin.
-- ----------------------------------------------------------------------------
insert into public.dishes (name, description, price, category, image_url, is_available)
select *
from (
  values
    (
      'Arroz de Camarón',
      'Arroz colorado, lleno de sabor caribeño, preparado con camarones frescos y especias de la región. Ideal para compartir.',
      35000::numeric, 'Platos Fuertes',
      'https://z-cdn-media.chatglm.cn/files/618438aa-692a-41ff-aa52-46821d36a49d.jpeg?auth_key=1885199246-fe9d77de764141fabf8ae1c90e3e5f4a-0-0becbdcf641017680cd84cf9bf071961',
      true
    ),
    (
      'Cerdo Guisado',
      'Cerdo cocinado a fuego lento en salsa tradicional, acompañado de arroz, patacón y ensalada. El sabor de la comida casera.',
      28000::numeric, 'Platos Fuertes',
      'https://z-cdn-media.chatglm.cn/files/30c2c83d-5f93-4ecb-9c01-7293b51113ab.jpeg?auth_key=1885199246-4bab8becbfbc4e2e8b5f89922da564bf-0-a622ca86799c86369ae175cf0eaa8b55',
      true
    ),
    (
      'Pescado Frito',
      'Fresco del día, frito hasta quedar dorado y crujiente, con el toque ahumado de la leña. Acompañado de patacones.',
      32000::numeric, 'Platos Fuertes',
      'https://z-cdn-media.chatglm.cn/files/37be5711-877c-4a2c-abb2-5b2aa99f4bcb.jpeg?auth_key=1885199246-2b36e3d08de6479186887b4085aba50b-0-f79089dbac91562f4b023121000b1fc5',
      true
    )
) as seed(name, description, price, category, image_url, is_available)
where not exists (select 1 from public.dishes);
