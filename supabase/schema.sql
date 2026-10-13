-- Rode no Supabase: SQL Editor > New query > Run
create extension if not exists pgcrypto;

create table establishments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) default auth.uid(),
  name text not null,
  slug text unique not null,            -- ex: barbearia-do-ze
  phone text, whatsapp text,            -- whatsapp só dígitos com DDI: 5599999999999
  address text, opening_hours text,
  created_at timestamptz default now()
);
create table services (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references establishments(id) on delete cascade,
  name text not null, description text,
  duration_minutes int not null check (duration_minutes > 0),
  price numeric(10,2) not null default 0
);
create table professionals (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references establishments(id) on delete cascade,
  name text not null, avatar_url text, bio text
);
create table availability (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references professionals(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6), -- 0=domingo
  start_time time not null, end_time time not null,
  lunch_start time, lunch_end time,
  unique (professional_id, day_of_week)  -- sem linha no dia = folga
);
create table appointments (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references establishments(id) on delete cascade,
  professional_id uuid not null references professionals(id),
  service_id uuid not null references services(id),
  client_name text not null, client_phone text not null,
  date date not null, time time not null,
  status text not null default 'pending'
    check (status in ('pending','confirmed','cancelled','completed')), -- completed = concluído
  created_at timestamptz default now()
);
-- impede dois agendamentos no mesmo início (proteção contra corrida)
create unique index no_double_booking on appointments(professional_id, date, time) where status <> 'cancelled';
create index on appointments(establishment_id, date);

-- Segurança (RLS): público lê o catálogo; só o dono edita; agendamentos entram pela API (service role)
create function is_owner(est uuid) returns boolean language sql stable security definer as
$$ select exists(select 1 from establishments where id = est and owner_id = auth.uid()) $$;

alter table establishments enable row level security;
alter table services enable row level security;
alter table professionals enable row level security;
alter table availability enable row level security;
alter table appointments enable row level security;

create policy pub_read on establishments for select using (true);
create policy own_all on establishments for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy pub_read on services for select using (true);
create policy own_all on services for all using (is_owner(establishment_id)) with check (is_owner(establishment_id));
create policy pub_read on professionals for select using (true);
create policy own_all on professionals for all using (is_owner(establishment_id)) with check (is_owner(establishment_id));
create policy pub_read on availability for select using (true);
create policy own_all on availability for all
  using (exists (select 1 from professionals p where p.id = professional_id and is_owner(p.establishment_id)))
  with check (exists (select 1 from professionals p where p.id = professional_id and is_owner(p.establishment_id)));
create policy own_all on appointments for all using (is_owner(establishment_id)) with check (is_owner(establishment_id));

alter publication supabase_realtime add table appointments; -- agenda em tempo real
