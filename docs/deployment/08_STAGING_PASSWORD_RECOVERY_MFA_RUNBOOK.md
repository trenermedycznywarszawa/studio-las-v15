# Studio Las OS — runbook odzyskiwania hasła z MFA (staging)

**Utrwalono:** 2026-10-30  
**Charakter:** instrukcja operacyjna / dowody testowe, NIE nowy kontrakt produktu, autoryzacji ani architektury.  
**Dotyczy:** kont trenera z TOTP, Supabase staging `ulauyoqjoetjqktegeuq`, aplikacja lokalna z poprawką PR #104.  
**Nie dotyczy:** kont produkcyjnych, zmian RLS/Auth, deploymentu i migracji.

## 1. Problem i sprawdzona przyczyna

Po otwarciu linku recovery aplikacja dawniej wyświetlała od razu formularz hasła.
Dla trenera mającego MFA Supabase odrzucał `PUT /auth/v1/user` jako
**HTTP 401, `insufficient_aal`**: aktualizacja hasła wymaga sesji **AAL2**.
Komunikat „Sesja wygasła albo link jest nieprawidłowy” był mylący.
W produkcji tę odmowę potwierdziły logi Auth 2026-10-30.

**Poprawny przebieg:** e-mail recovery → sprawdzenie callbacku → TOTP challenge → TOTP verify / AAL2 → formularz nowego hasła → `PUT /auth/v1/user` HTTP 200 → wylogowanie → logowanie *nowym* hasłem → MFA → panel trenera.

Poprawka: gałąź `codex/recovery-mfa-fix`, commit
`6590501a89a6fbfe81ede9703d4f70562285a3a6`, [Draft PR #104](https://github.com/trenermedycznywarszawa/studio-las-v15/pull/104).
Nie stosować tych instrukcji do starej wersji produkcyjnej przed jej aktualizacją.

## 2. Warunki i bezpieczeństwo

- Tylko staging; przed testem potwierdź wizualny napis **„WERSJA TESTOWA”** i identyfikator projektu `ulauyoqjoetjqktegeuq`.
- Używaj konta testowego, do którego masz uprawniony dostęp, z odbieraną skrzynką i już skonfigurowanym TOTP. Pełny test **zmienia jego hasło**. Nie używaj współdzielonego QA `attention.trainer@example.test`, ponieważ CI używa jego istniejącego hasła i nie ma ono skrzynki do recovery.
- Najlepszym rozwiązaniem na przyszłość jest osobne syntetyczne konto stagingowe z kontrolowaną skrzynką. Nie kopiuj danych z produkcji.
- Nigdy nie wklejaj do chatu, issue, logów ani repozytorium hasła, JWT, linku recovery, kodu lub sekretu TOTP.
- Nie osłabiaj MFA, RLS ani konfiguracji produkcyjnego Supabase; nie usuwaj użytkowników i ich czynników.
- Gdy callback przekierowuje do innego hosta lub środowiska, **STOP**. Staging musi dopuszczać dokładny redirect lokalny; brak allowlisty to blokada testu, a nie powód do zmiany produkcji.

## 3. Powtarzalna procedura (Windows PowerShell)

**Okno A — repo / serwer.** Uruchom w istniejącym izolowanym worktree poprawki:

```powershell
cd "C:\Users\Damian\Documents\Panel\studio-las-v15-gh\.worktrees\recovery-mfa-fix"
git rev-parse --short HEAD
node scripts/build_studio_las_os_deploy.mjs --staging
py -m http.server 8796 --bind 127.0.0.1 --directory .deploy/studio-las-os
```

Oczekuj SHA `6590501`, komunikatu `STUDIO_LAS_OS_DEPLOY_READY`
i uruchomionego serwera na `127.0.0.1:8796`. Pozostaw serwer uruchomiony.
W przeglądarce otwórz `http://127.0.0.1:8796/studio-las-os.html`
i potwierdź **„WERSJA TESTOWA”**. Jeżeli wcześniejsza sesja jest aktywna, wyloguj się.

**Okno B — pojedyncza prośba recovery** do stagingowego Supabase.
Lokalna strona HTTP może nie pozwolić na wysłanie resetu przez własne UI,
ponieważ `requestPasswordRecovery()` wymaga callbacku HTTPS.
Dlatego do lokalnego testu używamy jawnego `POST /auth/v1/recover`
z dokładnym `redirect_to`. Klucz *publishable* jest publicznym kluczem aplikacji stagingowej, nie kluczem `service_role`.

```powershell
$stagingEmail = Read-Host "E-mail kontrolowanego konta stagingowego"
$stagingPublishableKey = Read-Host "Publishable key stagingu (z konfiguracji stagingowej)"
$redirect = [uri]::EscapeDataString("http://127.0.0.1:8796/studio-las-os.html")

Invoke-RestMethod -Uri "https://ulauyoqjoetjqktegeuq.supabase.co/auth/v1/recover?redirect_to=$redirect" -Method Post -Headers @{ apikey = $stagingPublishableKey } -ContentType "application/json" -Body (@{ email = $stagingEmail } | ConvertTo-Json)
```

**Uwaga:** polecenie `Invoke-RestMethod` jest zapisane w jednej linii; nie stosuj backslash (`\`) jako znaku kontynuacji w PowerShell.

**Przeglądarka:**

1. Otwórz **najnowszy** e-mail recovery i kliknij link. Nie udostępniaj adresu zawierającego token.
2. Upewnij się, że callback kończy na `127.0.0.1:8796`, nie na produkcyjnym Netlify.
3. Aplikacja **najpierw** musi pokazać weryfikację TOTP; wpisz kod z aplikacji uwierzytelniającej.
4. **Dopiero po AAL2** powinien pojawić się formularz nowego hasła. Wpisz nowe, unikatowe hasło (12–128 znaków) i potwierdź. To zmienia hasło konta stagingowego.
5. Po udanym zapisie i wejściu do panelu **wyloguj się**.
6. Zaloguj się *nowym* hasłem, wykonaj MFA i sprawdź, czy ponownie widzisz panel.

Jeśli chcesz sprawdzić wyłącznie step-up (bez zmiany hasła), zakończ po kroku 3–4 **przed wysłaniem formularza** i oznacz zapis hasła oraz powtórne logowanie jako NOT RUN.

## 4. Dowody i status walidacji z 2026-10-30

**Potwierdzono na rzeczywistym stagingu:**
- `GET /auth/v1/verify` → HTTP 303 (wejście przez link recovery);
- `POST /auth/v1/factors/{id}/challenge` → HTTP 200;
- `POST /auth/v1/factors/{id}/verify` → HTTP 200;
- `PUT /auth/v1/user` → HTTP 200 (zapis nowego hasła);
- panel Trainer A otworzył się w przeglądarce na `127.0.0.1:8796`.

**Nie potwierdzono jeszcze niezależnym dowodem:** wylogowania i ponownego logowania *nowym* hasłem + MFA po ostatnim zapisie. To osobny końcowy warunek pełnego E2E, nie można go oznaczać PASS na podstawie samego panelu.

**Pozytywna kontrola:** na produkcyjnym Supabase wcześniej występowało `PUT /auth/v1/user` → 401 `insufficient_aal`; na stagingu poprawiony przepływ osiągnął HTTP 200. Tych środowisk nie utożsamiać.

Dowody mogą zawierać jedynie nazwy operacji, ich statusy, czas i informację staging/produkcja, bez danych wrażliwych. PASS nowej wersji nie oznacza jej publikacji. Stan PR i aktualnego deployu zawsze sprawdzaj ponownie.

## 5. Szybka diagnostyka przy kolejnej awarii

| Objaw | Co sprawdzić w pierwszej kolejności |
| --- | --- |
| `invalid_credentials` przy logowaniu | Czy chodzi o **staging** vs **produkcję**; oba projekty mają niezależne konta i hasła |
| Link recovery dochodzi, ale PUT zwraca 401 `insufficient_aal` | Czy TOTP wykonało się **przed** zapisem hasła i czy token sesji ma `aal2` |
| Link wraca na inną domenę albo localhost nie działa | Dokładny callback i allowlista redirectów stagingowego Supabase; nie zmieniaj konfiguracji produkcji |
| Ekran pokazuje „sesja wygasła” | Odczytaj **kod błędu Supabase**, nie polegaj tylko na ogólnym komunikacie UI |
| Panel otwiera się, ale brak pewności co do nowego hasła | Wyloguj się i zaloguj **nowym hasłem + MFA** |
| Staging działa, produkcja nadal odmawia | Sprawdź, czy poprawka została faktycznie **scalona i wdrożona** na produkcję |

## 6. Granice decyzji

Ta instrukcja jest **procedurą**, a nie pozwoleniem na resetowanie cudzych haseł, zmianę polityk Auth, usuwanie MFA ani deployment. Każdy test z rzeczywistą zmianą hasła wymaga upoważnienia do użycia tego konkretnego konta. Poprawka PR #104 nie może zostać uznana za produkcyjnie wdrożoną tylko dlatego, że istnieje w GitHubie.

**Skrót dla nowego chatu:** „Otwórz `docs/deployment/08_STAGING_PASSWORD_RECOVERY_MFA_RUNBOOK.md`. Pracujemy nad PR #104 (Recovery MFA). Odtwórz tylko brakujący test i nie powtarzaj analiz od zera”.
