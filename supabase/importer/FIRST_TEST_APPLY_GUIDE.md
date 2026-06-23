# Studio Las OS 9.0 - pierwszy test apply-mode

Ta instrukcja dotyczy tylko pustego projektu testowego Supabase:

`studio-las-os9-apply-test`

Nie używaj jej na produkcyjnej bazie.

## 1. Przygotuj pusty projekt Supabase

1. Wejdź do Supabase Dashboard.
2. Utwórz nowy projekt testowy, np. `studio-las-os9-apply-test`.
3. Poczekaj, aż projekt będzie gotowy.
4. Nie dodawaj żadnych prawdziwych klientów ręcznie.
5. Nie uruchamiaj seedów testowych RLS w tym projekcie.

## 2. Uruchom migracje 001/002/003

W Supabase Dashboard otwórz SQL Editor i uruchom dokładnie w tej kolejności:

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_rls_policies.sql`
3. `supabase/migrations/003_client_safe_views.sql`

Po każdym pliku sprawdź, czy SQL Editor nie pokazuje błędu.

Nie uruchamiaj:

- `supabase/dev/seed_test_data.sql`
- `supabase/tests/rls_access_tests.sql`

Ten projekt ma być czysty pod test importera, bez fikcyjnych danych RLS harness.

## 3. SQL do utworzenia trenera testowego

W SQL Editor uruchom poniższy SQL. Używa fikcyjnego `auth_user_id` i fikcyjnego e-maila testowego.

```sql
insert into public.profiles (
  auth_user_id,
  role,
  display_name,
  email
) values (
  '00000000-0000-4000-8000-000000000901',
  'trainer',
  'Studio Las Test Trainer',
  'trainer.apply.test@example.test'
)
returning id as trainer_profile_id;
```

Skopiuj wartość `trainer_profile_id` z wyniku. Będzie potrzebna jako:

`--trainer-profile-id <trainer-profile-id>`

## 4. Jak odczytać trainer-profile-id ponownie

Jeśli zamkniesz wynik SQL, możesz odczytać ID ponownie:

```sql
select id as trainer_profile_id
from public.profiles
where auth_user_id = '00000000-0000-4000-8000-000000000901'
  and role = 'trainer';
```

## 5. Gdzie znaleźć SUPABASE_URL

W Supabase Dashboard:

1. Otwórz projekt testowy.
2. Wejdź w `Project Settings`.
3. Wejdź w `API`.
4. Skopiuj `Project URL`.

To jest `SUPABASE_URL`, np.:

```text
https://<project-ref>.supabase.co
```

`<project-ref>` to część przed `.supabase.co`.

## 6. Gdzie znaleźć SUPABASE_SERVICE_ROLE_KEY

W tym samym miejscu:

1. `Project Settings`
2. `API`
3. Znajdź `service_role` key.
4. Skopiuj go tylko lokalnie do terminala.

Nie wklejaj service role key do chata, PR, commita, dokumentów ani screenshotów.

## 7. Ustaw zmienne w Windows PowerShell

W lokalnym PowerShell, w katalogu repozytorium, ustaw zmienne tylko dla bieżącej sesji terminala:

```powershell
$env:SUPABASE_URL="https://<project-ref>.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"
```

Nie zapisuj tych wartości do pliku.
Nie commituj ich.
Nie wklejaj ich do rozmowy.

## 8. Uruchom apply-mode

Najpierw upewnij się, że eksport localStorage jest lokalnie w:

```text
tmp/studio-las-localstorage-export-2026-06-23.json
```

Uruchom z katalogu głównego repo:

```powershell
node supabase/importer/dry_run_importer.mjs tmp/studio-las-localstorage-export-2026-06-23.json `
  --out tmp/private-apply-report.json `
  --apply `
  --confirm-test-db `
  --confirm-project-ref <project-ref> `
  --trainer-profile-id <trainer-profile-id>
```

Ważne:

- `<project-ref>` musi być identyczny jak w `SUPABASE_URL`.
- `<trainer-profile-id>` to UUID zwrócony przez SQL z sekcji 3.
- Raport `tmp/private-apply-report.json` zostaje lokalnie i nie może trafić do Git.

## 9. Wyniki oznaczające sukces

Sukces oznacza:

- komenda kończy się bez fatal error,
- raport `tmp/private-apply-report.json` powstaje lokalnie,
- `apply.batchId` jest ustawione,
- `apply.counts.errors` wynosi `0`,
- `legacy_import_batches.status` w bazie to `completed`,
- `legacy_import_records` zawiera wpisy audytu,
- w konsoli nie pojawia się service role key.

Apply V1 nie oznacza pełnej migracji produkcyjnej. To tylko test kontrolowanego zapisu do pustej bazy.

## 10. Sprawdź liczbę rekordów po imporcie

W SQL Editor projektu testowego możesz uruchomić:

```sql
select 'clients' as table_name, count(*) from public.clients
union all select 'client_intakes', count(*) from public.client_intakes
union all select 'sessions', count(*) from public.sessions
union all select 'pre_session_checks', count(*) from public.pre_session_checks
union all select 'client_tasks', count(*) from public.client_tasks
union all select 'body_measurements', count(*) from public.body_measurements
union all select 'assessment_results', count(*) from public.assessment_results
union all select 'exercises', count(*) from public.exercises
union all select 'home_plans', count(*) from public.home_plans
union all select 'home_plan_items', count(*) from public.home_plan_items
union all select 'reports', count(*) from public.reports
union all select 'client_documents', count(*) from public.client_documents
union all select 'client_access_credentials', count(*) from public.client_access_credentials
union all select 'legacy_import_batches', count(*) from public.legacy_import_batches
union all select 'legacy_import_records', count(*) from public.legacy_import_records
order by table_name;
```

Oczekiwane zachowanie V1:

- `client_documents` powinno zostać `0`,
- `client_access_credentials` powinno zostać `0`,
- dane Tanita PDF powinny być tylko jako redacted audit / needs review, bez Storage upload,
- raporty legacy powinny być `audience = 'trainer'`, `status = 'draft'`.

## 11. Sprawdź, że dane nie poszły do złego projektu

1. W SQL Editor projektu testowego uruchom:

```sql
select id, status, storage_key, created_at
from public.legacy_import_batches
order by created_at desc
limit 5;
```

2. Sprawdź, czy widzisz batch importu w projekcie `studio-las-os9-apply-test`.
3. Wejdź w Dashboard projektu produkcyjnego, jeśli istnieje.
4. Nie powinno tam być nowego `legacy_import_batches`.
5. Jeżeli masz jakąkolwiek wątpliwość, zatrzymaj test i nie powtarzaj apply.

## 12. Czego absolutnie nie robić

- Nie używać produkcyjnej bazy.
- Nie uruchamiać apply na bazie z seedami RLS testów.
- Nie uruchamiać `seed_test_data.sql`.
- Nie uruchamiać `rls_access_tests.sql`.
- Nie commitować `tmp/`.
- Nie commitować eksportu localStorage.
- Nie commitować `tmp/private-apply-report.json`.
- Nie wklejać service role key do chata.
- Nie wklejać raw JSON do chata.
- Nie podłączać frontendu.
- Nie dodawać Supabase clienta do aplikacji.
- Nie wykonywać Storage upload w V1.
- Nie tworzyć kont klientów/Auth w tym kroku.

## 13. Co dalej po teście

Po teście pokaż tylko zbiorcze liczby:

- `apply.counts`
- liczba rekordów w tabelach
- liczba `legacy_import_records`
- liczba błędów
- liczba `needs_review`

Nie pokazuj danych osobowych, nazw klientów, e-maili, telefonów, treści medycznych, raw JSON ani service role key.

