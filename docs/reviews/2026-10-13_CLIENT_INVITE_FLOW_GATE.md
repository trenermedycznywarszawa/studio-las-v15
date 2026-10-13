# Studio Las OS — bramka domknięcia zaproszenia klienta (2026-10-13)

**Status:** diagnostyka READ/PREPARE; bez zmiany Auth, RLS, danych lub produkcji.  
**Punkt odniesienia kodu:** `774b5287b8e724569e0a30d1bd23515fdc266ffc`.  
**Produkcyjny Netlify deploy:** `6ac3a16bc2f4bb1ed8234d1a`, `ready`, publikacja 2026-10-05; tytuł deployu odnosi się do `774b528`, ale Netlify nie podaje `commit_ref`. Nie utożsamiać tytułu z kryptograficznym potwierdzeniem zawartości.

## Obserwacje potwierdzone kodem

1. `supabase/functions/client-access/index.ts` w akcji `invite` odczytuje `STUDIO_LAS_CLIENT_REDIRECT_URL`. Jeśli zmienna jest pusta, odpowiada `client_redirect_not_configured`; jeśli jest niepusta, przekazuje ją do `inviteUserByEmail`. Kod nie potwierdza, jaka wartość jest faktycznie ustawiona w środowisku.
2. `assets/os/password-auth.js` akceptuje hash-session callback z `type=invite` lub `type=recovery`, a następnie otwiera formularz hasła. Callback z kodem PKCE nie jest obsługiwany.
3. `assets/os/app.js` po ustawieniu hasła wywołuje `loadAuthenticatedRuntime()`, który kieruje według roli profilu: `client` do `loadClientAppRuntime`, `trainer` do ścieżki MFA trenera. Wspólny ekran logowania nie jest dowodem przypisania złej roli.
4. `tools/client-access-admin.js` jest narzędziem wyłącznie trenerskim; nie jest stroną docelową zaproszenia klienta.
5. `docs/deployment/02_SUPABASE_AUTH_CONFIGURATION_GATE.md` zawiera historyczny URL GitHub Pages, jawnie oznaczony jako nieaktualny przykład. Nie używać go jako polecenia zmiany produkcyjnego redirectu.
6. `scripts/e2e_client_access_login.mjs` bada logowanie do panelu administracji dostępu w lokalnym preview z mockami. Nie dowodzi poprawnego przejścia z rzeczywiście doręczonego zaproszenia do ankiety.

## Blokery dowodowe — nie naprawiać na ślepo

- Brak potwierdzonej wartości `STUDIO_LAS_CLIENT_REDIRECT_URL` na produkcji i stagingu.
- Brak potwierdzenia dokładnej allowlisty Supabase Auth oraz Site URL dla obu projektów.
- Brak dowodu, czy faktycznie doręczony link ma hash-session czy code/PKCE i do jakiej ścieżki prowadzi (nie zapisywać samego linku ani tokenów).
- Brak świeżego E2E: zaproszenie → ustawienie hasła → rola klienta → przypisana ankieta → zapis/odświeżenie.
- Brak potwierdzenia zgodności deployed bundle z referencyjnym commitem.

## Weryfikacja na fikcyjnym koncie stagingowym

1. Potwierdzić wyłącznie **origin + pathname** skonfigurowanego redirectu, bez sekretów.
2. Porównać redirect z dozwolonymi adresami Supabase Auth i rzeczywistym punktem wejścia aplikacji.
3. Wysłać zaproszenie do fikcyjnego klienta z przypisaną ankietą; odnotować origin/path i format callbacku bez zapisywania tokenów.
4. W czystej przeglądarce sprawdzić: aktywacja hasła → `client` → ankieta → zapis → odświeżenie → zachowanie danych.
5. Sprawdzić scenariusze wygasłego/ponownie użytego linku, wylogowania i braku dostępu do danych innego klienta.
6. Dopiero po zidentyfikowaniu przyczyny przygotować najmniejszą poprawkę, test regresji i rollback. Każda zmiana Supabase Auth/redirectów lub środowiska wymaga osobnej bramki ryzyka i zatwierdzenia.

## Zakres świadomie niezmieniony

Nie zmieniono kodu logowania, sesji, MFA, RLS, migracji, Edge Function, adresów produkcyjnych ani danych klientów. Nie wykonano wysyłki zaproszeń i nie twierdzimy, że błąd został naprawiony.

## Następny punkt decyzyjny

Jeśli redirect i callback są poprawne, sprawdzić `profiles.role`, powiązanie `client_users`, przypisanie ankiety i błąd UI na fikcyjnym koncie. Jeśli redirect lub format callbacku są błędne, przygotować precyzyjną zmianę konfiguracji/kodu wraz z testem; nie stosować obejścia przez panel trenera.

## Aktualizacja 2026-10-13 — stan backendów (odczyt konektora)

- `list_projects` i osobne `get_project` potwierdziły `INACTIVE` dla **obu** projektów: staging `ulauyoqjoetjqktegeuq` oraz produkcyjnego ref `ufcumhbnuyernuwepcij`. Jest to blokada wykonania wiarygodnego E2E online; nie jest dowodem, że same dane zostały utracone.
- Metadane Edge Functions w obu projektach pokazują `client-access` jako `ACTIVE` (staging wersja 3, drugi projekt wersja 2). Status pojedynczej funkcji **nie znosi** stanu `INACTIVE` projektu.
- Konektor pozwolił odczytać kod wdrożonej funkcji, ale nie ujawnił konfiguracji Auth Site URL, redirect allowlist ani wartości `STUDIO_LAS_CLIENT_REDIRECT_URL`. Nie ustalono więc faktycznego redirectu.
- Nie wznawiano projektów, nie odczytywano danych klientów, nie wykonywano zaproszeń ani operacji mutujących.

**Nowa bramka:** przed jakąkolwiek próbą E2E trzeba rozstrzygnąć powód stanu `INACTIVE`, koszt i ryzyko wznowienia stagingu oraz zgodność docelowych projektów z konfiguracją aplikacji. Wznowienie produkcji wymaga osobnej decyzji właściciela po ocenie skutków. Nie naprawiać frontendowego redirectu na podstawie niepotwierdzonej hipotezy.
