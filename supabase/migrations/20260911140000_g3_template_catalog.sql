insert into public.templates (id, name, category, renderer_version, content_schema_version, enabled_for_new)
values
  ('vow-editorial', 'Vow Editorial', 'wedding', 1, 1, true),
  ('silk-promise', 'Silk Promise', 'engagement', 1, 1, true),
  ('garden-vow', 'Garden Vow', 'wedding', 1, 1, true),
  ('midnight-toast', 'Midnight Toast', 'other', 1, 1, true),
  ('little-orbit', 'Little Orbit', 'birthday_baby', 1, 1, true),
  ('confetti-club', 'Confetti Club', 'birthday_baby', 1, 1, true),
  ('new-chapter', 'New Chapter', 'graduation', 1, 1, true),
  ('linen-table', 'Linen Table', 'other', 1, 1, true),
  ('afterglow', 'Afterglow', 'engagement', 1, 1, true),
  ('reunion-notes', 'Reunion Notes', 'other', 1, 1, true)
on conflict (id) do update
set name = excluded.name,
    category = excluded.category,
    renderer_version = excluded.renderer_version,
    content_schema_version = excluded.content_schema_version,
    enabled_for_new = excluded.enabled_for_new;
