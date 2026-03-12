-- =========================================================
-- 1) Tablas: colegios y secciones por promotora (auth.users)
-- =========================================================

create table if not exists public.colegios (
  id uuid primary key default gen_random_uuid(),
  promotora_id uuid not null references auth.users(id) on delete cascade,
  nombre text not null,
  created_at timestamp with time zone default now()
);

create table if not exists public.secciones (
  id uuid primary key default gen_random_uuid(),
  colegio_id uuid not null references public.colegios(id) on delete cascade,
  nombre text not null,
  public_code text not null unique default gen_random_uuid()::text,
  is_active boolean not null default true,
  created_at timestamp with time zone default now()
);

-- =========================================================
-- 2) Extender tabla existente de fichas (si ya existe)
-- =========================================================

alter table public.fichas_colegio
  add column if not exists colegio_id uuid references public.colegios(id),
  add column if not exists seccion_id uuid references public.secciones(id),
  add column if not exists section_code text;

create index if not exists fichas_idx_seccion_id on public.fichas_colegio(seccion_id);
create index if not exists fichas_idx_colegio_id on public.fichas_colegio(colegio_id);
create index if not exists secciones_idx_colegio_id on public.secciones(colegio_id);

-- =========================================================
-- 3) Vista pública: lookup por public_code (para alumnos)
--    (solo devuelve lo mínimo necesario para mostrar encabezado
--     y para insertar la ficha con colegio_id/seccion_id)
-- =========================================================

create or replace view public.secciones_public as
select
  s.id,
  s.nombre,
  s.colegio_id,
  s.public_code,
  c.nombre as colegio_nombre
from public.secciones s
join public.colegios c on c.id = s.colegio_id
where s.is_active = true;

-- =========================================================
-- 4) RLS: seguridad
-- =========================================================

alter table public.colegios enable row level security;
alter table public.secciones enable row level security;
alter table public.fichas_colegio enable row level security;

-- Promotoras: solo ven y gestionan sus colegios
drop policy if exists colegios_select_own on public.colegios;
create policy colegios_select_own
on public.colegios
for select
to authenticated
using (promotora_id = auth.uid());

drop policy if exists colegios_insert_own on public.colegios;
create policy colegios_insert_own
on public.colegios
for insert
to authenticated
with check (promotora_id = auth.uid());

drop policy if exists colegios_update_own on public.colegios;
create policy colegios_update_own
on public.colegios
for update
to authenticated
using (promotora_id = auth.uid())
with check (promotora_id = auth.uid());

drop policy if exists colegios_delete_own on public.colegios;
create policy colegios_delete_own
on public.colegios
for delete
to authenticated
using (promotora_id = auth.uid());

-- Secciones: solo dentro de colegios de la promotora
drop policy if exists secciones_select_own on public.secciones;
create policy secciones_select_own
on public.secciones
for select
to authenticated
using (
  exists (
    select 1
    from public.colegios c
    where c.id = secciones.colegio_id
      and c.promotora_id = auth.uid()
  )
);

drop policy if exists secciones_insert_own on public.secciones;
create policy secciones_insert_own
on public.secciones
for insert
to authenticated
with check (
  exists (
    select 1
    from public.colegios c
    where c.id = secciones.colegio_id
      and c.promotora_id = auth.uid()
  )
);

drop policy if exists secciones_update_own on public.secciones;
create policy secciones_update_own
on public.secciones
for update
to authenticated
using (
  exists (
    select 1
    from public.colegios c
    where c.id = secciones.colegio_id
      and c.promotora_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.colegios c
    where c.id = secciones.colegio_id
      and c.promotora_id = auth.uid()
  )
);

drop policy if exists secciones_delete_own on public.secciones;
create policy secciones_delete_own
on public.secciones
for delete
to authenticated
using (
  exists (
    select 1
    from public.colegios c
    where c.id = secciones.colegio_id
      and c.promotora_id = auth.uid()
  )
);

-- Vista pública: permitir SELECT a anon/authenticated (alumnos)
-- Nota: las policies se aplican a tablas, no a views, pero Supabase
-- requiere permisos en la vista y que las tablas permitan el acceso
-- que la vista necesita. Para evitar exponer tablas completas,
-- se recomienda usar esta vista y NO dar select directo a secciones.
grant select on public.secciones_public to anon, authenticated;

-- Para que la vista funcione, permitimos a anon seleccionar SOLO filas activas
-- (el código es un UUID difícil de adivinar; el alumno consulta por public_code).
drop policy if exists secciones_select_active_anon on public.secciones;
create policy secciones_select_active_anon
on public.secciones
for select
to anon
using (is_active = true);

drop policy if exists colegios_select_for_public_view_anon on public.colegios;
create policy colegios_select_for_public_view_anon
on public.colegios
for select
to anon
using (true);

-- Fichas: alumnos (anon) pueden INSERT solo si la sección existe y está activa
drop policy if exists fichas_insert_by_section on public.fichas_colegio;
create policy fichas_insert_by_section
on public.fichas_colegio
for insert
to anon
with check (
  seccion_id is not null
  and exists (
    select 1
    from public.secciones s
    where s.id = fichas_colegio.seccion_id
      and s.is_active = true
  )
);

-- Fichas: promotoras pueden SELECT solo si la ficha pertenece a sus colegios
drop policy if exists fichas_select_own on public.fichas_colegio;
create policy fichas_select_own
on public.fichas_colegio
for select
to authenticated
using (
  exists (
    select 1
    from public.secciones s
    join public.colegios c on c.id = s.colegio_id
    where s.id = fichas_colegio.seccion_id
      and c.promotora_id = auth.uid()
  )
);

-- Fichas: promotoras pueden DELETE solo si la ficha pertenece a sus colegios
drop policy if exists fichas_delete_own on public.fichas_colegio;
create policy fichas_delete_own
on public.fichas_colegio
for delete
to authenticated
using (
  exists (
    select 1
    from public.secciones s
    join public.colegios c on c.id = s.colegio_id
    where s.id = fichas_colegio.seccion_id
      and c.promotora_id = auth.uid()
  )
);

