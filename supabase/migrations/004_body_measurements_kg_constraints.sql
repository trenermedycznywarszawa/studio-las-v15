-- Studio Las OS 9.0
-- Align Tanita muscle mass constraints with the data contract: muscle mass is stored in kilograms.

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'body_measurements'
      and column_name = 'muscle_mass_kg'
  ) then
    alter table public.body_measurements
      drop constraint if exists body_measurements_muscle_mass_check;

    alter table public.body_measurements
      add constraint body_measurements_muscle_mass_check
      check (muscle_mass_kg is null or muscle_mass_kg between 0 and 120);
  elsif exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'body_measurements'
      and column_name = 'muscle_mass'
  ) then
    alter table public.body_measurements
      drop constraint if exists body_measurements_muscle_mass_check;

    alter table public.body_measurements
      add constraint body_measurements_muscle_mass_check
      check (muscle_mass is null or muscle_mass between 0 and 120);
  end if;
end $$;
