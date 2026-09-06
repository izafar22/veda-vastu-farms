create table if not exists site_content (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
insert into site_content(key,value) values ('home', '{"eyebrow":"GREATER NOIDA · PRIVATE FARMHOUSE LIVING","headline":"Own a piece of the quiet.","subcopy":"Not another plot. A private green world designed for weekends, family, legacy and long-horizon thinking.","minPlot":"1 Bigha*","price":"₹8,000*","planned":"55 Acres*"}') on conflict (key) do nothing;
