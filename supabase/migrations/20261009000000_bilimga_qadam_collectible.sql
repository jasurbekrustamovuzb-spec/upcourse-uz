insert into public.collectibles (id, title, subtitle)
values (
  'bilimga-qadam-1',
  'Bilimga qadam',
  'Istalgan testni kamida 70% natija bilan yakunlang'
)
on conflict (id) do update
set title = excluded.title,
    subtitle = excluded.subtitle;

