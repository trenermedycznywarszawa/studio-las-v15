# Studio Las OS 9.0 - ręczna walidacja runtime

## Status walidacji

Walidacja runtime Phase 1 przeszla w realnym pustym projekcie testowym Supabase.

Uruchomiona kolejnosc:

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_rls_policies.sql`
3. `supabase/migrations/003_client_safe_views.sql`
4. `supabase/dev/seed_test_data.sql`
5. `supabase/tests/rls_access_tests.sql`

Ostateczny komunikat w Supabase SQL Editor:

`Studio Las OS 9.0 RLS access tests completed`

Wazne poprawki harnessu:

- `seed_test_data.sql` uzywa `array[...]` przy dopisywaniu elementow do tablic PostgreSQL.
- `rls_access_tests.sql` dziala bez funkcji tymczasowych, bez `pg_temp` i bez zaleznosci od `search_path`.

Ta instrukcja służy do uruchomienia migracji i testów RLS w prawdziwym środowisku Supabase SQL.

Nie uruchamiaj tego na produkcyjnej bazie. Użyj pustego projektu testowego Supabase albo świeżo zresetowanej bazy testowej.

## Cel

Sprawdzić, czy:

- migracje SQL przechodzą od zera,
- tabele, funkcje, RLS i widoki powstają poprawnie,
- testowe dane dev można załadować,
- role `trainer`, `client` i `anon` widzą dokładnie to, co powinny,
- widoki client-safe nie pokazują danych innego klienta ani pól trenerskich.

## Wymagania

- Pusty projekt testowy Supabase.
- Dostęp do Supabase Dashboard.
- Dostęp do SQL Editor.
- Nie używaj bazy produkcyjnej.
- Nie wklejaj prawdziwych danych klientów.

## Kolejność uruchamiania

W Supabase Dashboard otwórz:

`SQL Editor` -> `New query`

Uruchamiaj pliki pojedynczo, dokładnie w tej kolejności.

## Krok 1 - initial schema

1. Otwórz lokalny plik:

   `supabase/migrations/001_initial_schema.sql`

2. Skopiuj całą zawartość pliku.
3. Wklej do Supabase SQL Editor.
4. Kliknij `Run`.
5. Sukces oznacza brak błędu `ERROR`.

Ten krok tworzy tabele, indeksy, constraints i trigger `updated_at`.

## Krok 2 - RLS policies

1. Otwórz lokalny plik:

   `supabase/migrations/002_rls_policies.sql`

2. Skopiuj całą zawartość pliku.
3. Wklej do nowego zapytania w SQL Editor.
4. Kliknij `Run`.
5. Sukces oznacza brak błędu `ERROR`.

Ten krok tworzy funkcje pomocnicze RLS, włącza RLS na tabelach, ustawia grants i polityki.

## Krok 3 - client-safe views

1. Otwórz lokalny plik:

   `supabase/migrations/003_client_safe_views.sql`

2. Skopiuj całą zawartość pliku.
3. Wklej do nowego zapytania w SQL Editor.
4. Kliknij `Run`.
5. Sukces oznacza brak błędu `ERROR`.

Ten krok tworzy widoki:

- `client_portal_summary`
- `client_active_home_plan`
- `client_visible_reports`
- `client_visible_measurements`
- `client_guidance_status`

Wszystkie powinny mieć `security_barrier`.

## Krok 4 - testowe dane dev

1. Otwórz lokalny plik:

   `supabase/dev/seed_test_data.sql`

2. Skopiuj całą zawartość pliku.
3. Wklej do nowego zapytania w SQL Editor.
4. Kliknij `Run`.
5. Sukces oznacza brak błędu `ERROR`.

Seed tworzy wyłącznie fikcyjne dane:

- `trainer_a`
- `trainer_b`
- `client_a`
- `client_b`
- `client_without_published_data`

Oraz testowe rekordy published, draft, trainer-only i soft-deleted.

## Krok 5 - testy RLS i widoków

1. Otwórz lokalny plik:

   `supabase/tests/rls_access_tests.sql`

2. Skopiuj całą zawartość pliku.
3. Wklej do nowego zapytania w SQL Editor.
4. Kliknij `Run`.

Sukces oznacza:

- brak błędu `ERROR`,
- na końcu wynik:

  `Studio Las OS 9.0 RLS access tests completed`

Testy sprawdzają:

- `trainer_a` widzi tylko `client_a`,
- `trainer_b` widzi tylko `client_b`,
- klient widzi tylko swoje widoki client-safe,
- klient nie widzi raw intake,
- klient nie widzi pól trenerskich,
- klient nie widzi danych drugiego klienta,
- klient nie może zmienić roli na `trainer`,
- klient nie może dopisać się do cudzego `client_id`,
- `anon` nie widzi danych.

## Wyniki oznaczające sukces

Cała walidacja jest zaliczona, jeśli:

- wszystkie 5 plików SQL wykonuje się bez `ERROR`,
- test RLS kończy się komunikatem:

  `Studio Las OS 9.0 RLS access tests completed`

- nie pojawia się komunikat:

  `ASSERTION FAILED`

## Błędy krytyczne

Przerwij test i nie idź dalej, jeśli zobaczysz:

- `ASSERTION FAILED`
- `permission denied`
- `relation "..." does not exist`
- `function "..." does not exist`
- `auth.users table is required`
- błąd przy `SET LOCAL ROLE authenticated`
- błąd przy `SET LOCAL ROLE anon`
- błąd mówiący, że widok pokazuje zakazane pole
- błąd mówiący, że klient widzi dane innego klienta

W takim przypadku zapisz:

- nazwę uruchamianego pliku,
- pełny komunikat błędu,
- numer linii, jeśli Supabase go pokaże.

## Czego nie robić

- Nie uruchamiaj `seed_test_data.sql` na produkcyjnej bazie.
- Nie uruchamiaj `rls_access_tests.sql` na produkcyjnej bazie.
- Nie wklejaj prawdziwych danych klientów do testowego seed file.
- Nie podłączaj jeszcze frontendu.
- Nie twórz importera localStorage.
- Nie zmieniaj `studio-management-os-3.0.html`.
- Nie dawaj klientom bezpośredniego dostępu do bazowych tabel procesowych.

## Po udanym teście

Po udanej walidacji można przejść do projektowania importera `localStorage -> Supabase`.

Nadal nie należy jeszcze podłączać frontendu ani logowania do Studio Las OS 8.0.
