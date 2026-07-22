# Studio Las OS — Product Recovery Audit — 2026-07-22

## 0. Decyzja wykonawcza

Studio Las OS nie wymaga przywrócenia starej aplikacji. Wymaga odzyskania ciągłości decyzji trenera na bezpiecznym runtime.

Fundamentem technicznym pozostaje wyłącznie commit `446c522ca5c61a9ad01808e7a03ea1ae9138527c`. Historyczny monolit jest materiałem dowodowym, nie źródłem kodu do przeniesienia. Jedynym produkcyjnym źródłem prawdy pozostaje Supabase.

Największa luka produktowa nie polega na braku ekranów. Polega na tym, że bezpieczny runtime potrafi zapisać wiele właściwych obiektów, ale nie składa ich w spokojny kontekst odpowiadający na pytanie trenera:

> Co powinienem pamiętać i zdecydować dla tego klienta przed następną sesją?

Pierwszym PR-em implementacyjnym powinien być **read-only Trainer Session Brief**: mały, trener-only przekrój istniejących danych Supabase przed sesją. Nie wymaga migracji, nie wprowadza nowych zapisów i testuje właściwą hierarchię informacji przed rozbudową kolejnych przepływów.

Nie należy teraz odzyskiwać generatora raportów, atlasu ćwiczeń, dokumentów ani starego portalu. Ich pozorna kompletność jest obciążona największym długiem: lokalną persystencją, automatycznym znaczeniem, starym dostępem klienta lub nadmiarem ekranu.

---

## 1. Zweryfikowany stan Git

### 1.1 Repozytorium i dostęp

- Repozytorium: `trenermedycznywarszawa/studio-las-v15`.
- Domyślna gałąź zdalna: `main`.
- Integracja GitHub potwierdziła uprawnienia odczytu i zapisu.
- W tej sesji nie był dostępny checkout `C:\Users\Damian\Documents\Panel\studio-las-v15-gh`.
- Bieżący katalog roboczy nie był repozytorium Git, a `gh` nie był zainstalowany. Z tego powodu lokalnych referencji nie można było zweryfikować i nie są one przedstawiane jako fakt.
- Stan zdalny został zweryfikowany przez GitHub API.

### 1.2 Commit bazowy i PR #13

| Dowód | Wynik |
|---|---|
| Commit `446c522ca5c61a9ad01808e7a03ea1ae9138527c` | Istnieje; tytuł `docs: record final security regression pass`; dodaje wyłącznie `docs/deployment/07_FINAL_SECURITY_REGRESSION_2026-07-21.md`. |
| PR #13 | `merged=true`, zamknięty; tytuł `Add mandatory trainer TOTP MFA with AAL2 enforcement`. |
| Merge commit PR #13 | `1d5362e8f40096676532ef3f28908e2fe7df8196`. |
| Relacja `1d5362e8… → 446c522…` | `446c522…` jest potomkiem merge commita i znajduje się 2 commity dalej; merge commit jest merge-base. |
| Zawartość różnicy od merge do bazy | Jedna jednoliniowa zmiana workflow backupu oraz końcowy raport bezpieczeństwa; brak zmian produktu po merge PR #13. |
| `agent/security-architecture-hardening` | Wskazuje dokładnie `446c522…`. |
| `agent/product-recovery-audit` przed audytem | Nie istniała. |

Etap bezpieczeństwa pozostaje **CLOSED / PASS**. Ten audyt nie powtarza testów MFA, RLS, Storage, Edge Function, backupu ani portalu.

### 1.3 Krytyczna rozbieżność: `main` nie jest bazą odzyskania

`main` wskazuje commit `e371c7694f2c30b3bcf1a1bbbab5d3a9ac7b68ba` i jest rozbieżny z `446c522…`:

- linia `446c522…` ma 122 commity niedostępne na `main`;
- `main` ma 1 własny commit poza wspólną bazą;
- wspólny merge-base to `c7206dc043ca59e172cd208cfdacbccb3a28586c`.

Wniosek: Draft PR audytu nie może być skierowany do `main`, bo przedstawiałby około 122 niezwiązane commity jako zakres audytu. Poprawną bazą PR-a jest `agent/security-architecture-hardening`, która jest identyczna z wymaganym commitem `446c522…`.

To nie rozwiązuje problemu długoterminowego: historia `main` wymaga osobnej decyzji integracyjnej. Nie należy jednak mieszać jej z Product Recovery Audit.

---

## 2. Dokładna mapa implementacji

### 2.1 Stara rozwinięta aplikacja

Na commicie bazowym plik `studio-management-os-3.0.html` **nie zawiera starej aplikacji**. Jest 64-liniową bramą wycofania, która nie odczytuje i nie zapisuje danych.

Rzeczywista rozwinięta wersja została odzyskana z historii:

- `studio-management-os-3.0.html@c7206dc043ca59e172cd208cfdacbccb3a28586c`;
- 13 461 linii;
- około 706 685 znaków;
- UI, style, dane demo, biblioteki, heurystyki, Auth, REST i persystencja w jednym pliku.

To jest właściwy materiał porównawczy. Nie jest to kod do ponownego uruchomienia.

### 2.2 Bezpieczny runtime

- Entry point: `studio-las-os.html@446c522`.
- Orkiestracja i role: `assets/os/app.js@446c522`.
- Konfiguracja, sesja Auth i blokada danych lokalnych: `assets/os/runtime.js@446c522`.
- Supabase Auth, REST/RPC i repository: `assets/os/data.js@446c522`.
- Sygnały uwagi, bez automatycznej decyzji: `assets/os/decision-support.js@446c522`.
- MFA trenera: `assets/os/trainer-mfa.js@446c522` i `assets/os/ui/trainer-mfa.js@446c522`.
- UI trenera: `assets/os/ui/trainer.js@446c522`.
- UI klienta: `assets/os/ui/client.js@446c522`.
- Formularze: `assets/os/ui/forms.js@446c522`.
- Bezpieczne helpery DOM: `assets/os/ui/common.js@446c522`.
- Warstwa wizualna i breakpointy: `assets/os/styles.css@446c522`.

### 2.3 Warstwa danych i API

`assets/os/data.js` jest jedyną produkcyjną warstwą zapisu. `StudioLasRepository` obsługuje:

- `clients`;
- `client_trainers`;
- `client_users`;
- `client_intakes`;
- `sessions`;
- `pre_session_checks`;
- `post_session_observations`;
- `client_tasks`;
- `client_documents`;
- `body_measurements`;
- `training_load_observations`;
- `assessment_results`;
- `exercises`;
- `home_plans`;
- `home_plan_items`;
- `guidance_events`;
- `guidance_pilots`;
- `guidance_pilot_feedback`;
- `reports`;
- tabele kontrolowanego importu legacy.

Klient korzysta tylko z RPC:

- `client_portal_snapshot()` — wąska projekcja klient-safe;
- `save_client_checkin()` — zwalidowany minimalny sygnał.

Administracja dostępu używa Edge Function `supabase/functions/client-access/index.ts` i RPC `trainer_client_access_status(uuid)`.

### 2.4 Schemat i migracje

- Schemat bazowy: `supabase/migrations/001_initial_schema.sql` — 23 tabele początkowe.
- Papier-first check-ins: `011_paper_first_client_checkins.sql`.
- Kanoniczny model Auth/RLS i RPC portalu: `012_security_hardening.sql`.
- Cykl dostępu i audit metadata-only: `013_access_lifecycle_and_audit.sql`.
- Prywatny bucket i polityki dokumentów: `014_private_client_documents.sql`.
- Dalsze naprawy dostępu i wydajności: `015–020`.
- Obowiązkowy TOTP/AAL2 trenera: `021_trainer_totp_mfa_aal2.sql`.

Migracja `012` usuwa `client_access_credentials`, a `013` dodaje `security_audit_events`; końcowy kontrakt nadal obejmuje 23 publiczne tabele aplikacyjne/audytowe z wymuszonym modelem RLS zgodnym z zamkniętym etapem bezpieczeństwa.

---

## 3. Rzeczywisty problem

### 3.1 Nie „brak starej aplikacji”, tylko przerwane połączenie decyzji

Stary monolit miał szerokość funkcjonalną, ale nie integralność:

- `load()` i `save()` używały `localStorage` pod kluczem `studioLasOS_v3`;
- prowadzenie między sesjami i pilot miały kolejne lokalne klucze;
- wiele obiektów miało status `local_only` lub kolejkę pozorującą synchronizację;
- Supabase ładował tylko `clients`, `sessions`, `body_measurements`, `reports` i `client_intakes`;
- zdalne zapisy obejmowały głównie klienta i RPC check-in;
- pozostałe bogate formularze często kończyły się lokalnym `save()`.

Bezpieczny runtime ma właściwą integralność, ale słabą kompozycję produktu:

- wszystkie produkcyjne zapisy przechodzą przez repository do Supabase;
- workspace ładuje intake, sesje, pre/post, zadania, dokumenty, pomiary, Polar, obserwacje, plany i raporty;
- UI pokazuje jednak głównie długą sekwencję niezależnych sekcji i formularzy;
- nie pokazuje jednej hierarchii: bezpieczeństwo → aktualny fokus → ostatnia decyzja → sygnał klienta → obecne papierowe prowadzenie → pytanie na sesję;
- część metod repository nie ma żadnej ścieżki UI.

Największym aktywem do odzyskania nie są ekrany starego monolitu. Jest nim **model pracy trenera wokół sesji**, który trzeba odtworzyć z istniejących bezpiecznych obiektów.

### 3.2 Najgroźniejsze błędne założenia

1. **„Stary plik nadal zawiera pełną aplikację na bazie audytu.”** Nie. Na `446c522` jest tylko bramą wycofania. Pełny monolit istnieje wyłącznie w historii (`c7206dc`).
2. **„Bogaty ekran oznacza istniejącą integrację.”** Nie. Duża część starych przepływów była lokalna albo demonstracyjna.
3. **„Wystarczy przenieść UI i podmienić zapis na Supabase.”** Nie. Stary UI zawierał stare granice dostępu, automatyczne heurystyki, lokalne kody, dane seed i sprzeczne obiekty. Kopiowanie odtworzyłoby dług domenowy.
4. **„Więcej ekranów przywróci wartość.”** Nie. Wartość powstaje wtedy, gdy informacja zmienia decyzję trenera lub wspiera raport.
5. **„Raport jest najlepszym pierwszym PR-em, bo jest artefaktem premium.”** Nie. Raport bez spójnego zapisu decyzji, guidance i sygnałów będzie elegancką syntezą braków.
6. **„`main` jest naturalną bazą Draft PR.”** Nie. Historia jest rozbieżna; taki PR miałby fałszywy zakres.
7. **„Obecny szeroki schemat przesądza docelową domenę.”** Nie. Dokumentacja architektury traktuje tabele jako audit inputs, nie jako najwyższą prawdę produktu.
8. **„Sesja, post-session observation i task to trzy oczywiste osobne zapisy.”** Nie. `sessions.trainer_decision`, `post_session_observations.decision`, `sessions.client_next_step`, `post_session_observations.home_task_text`, `client_tasks` i `home_plan_items` częściowo nakładają się semantycznie. Przed dodaniem nowych formularzy trzeba wybrać kanoniczną odpowiedzialność każdego obiektu.

### 3.3 Brakujące dane, których repozytorium nie rozstrzyga

- które pola trener realnie uzupełnia podczas i po 90-minutowej sesji;
- ile czasu może zająć zapis bez zakłócania relacji 1:1;
- jakość i kompletność historycznych rekordów po imporcie;
- które z duplikujących się pól są aktywnie używane;
- rzeczywista ergonomia na telefonie — kod ma breakpointy, ale brak dowodu z testu zadaniowego na urządzeniu;
- docelowy kanał komunikatu po sesji; repo nie zawiera prawdziwego komunikatora;
- zasady retencji i usuwania dokumentów wymagane przed uruchomieniem uploadu;
- czy katalog ćwiczeń ma być odzyskany w całości, czy tylko jako mała, zweryfikowana biblioteka trenera;
- dokładny stan wdrożenia produkcyjnego nie był sprawdzany i zgodnie z zakresem nie może być wnioskowany z Git.

Braki te nie blokują pierwszego, read-only PR-a. Blokują natomiast automatyzację raportów, migrację biblioteki, upload dokumentów i nowe zapisy o nakładającej się semantyce.

---

## 4. Audyt porównawczy obszar po obszarze

Status oznacza stan wartości produktu w bezpiecznym runtime, nie samo istnienie tabeli.

### 4.1 Lista i karta klienta

- **Stara aplikacja:** `renderCommand`, `clientCard`, `renderClient`, `renderClientAccessCard`, `renderOnboardingKitCard` tworzyły centrum klientów, priorytety, profil, dostęp i pakiet startowy.
- **Bezpieczny runtime:** selector klientów, formularz dodania oraz summary grid z typem współpracy, etapem, terminami, celem i kamieniem milowym. Brak zwartego kontekstu zdrowotnego, hipotezy, ostatniej decyzji i bezpiecznego edit/archive flow w UI.
- **Dane/API/moduły:** `clients`; `listClients()`, `getClient()`, `getClientWorkspace()`, `createClient()`, `updateClient()`, `archiveClient()`; `assets/os/data.js`, `assets/os/ui/trainer.js`, `assets/os/ui/forms.js`.
- **Dowód:** stary `studio-management-os-3.0.html@c7206dc` (`renderCommand`, `renderClient`); bezpieczny `assets/os/ui/trainer.js@446c522` (`summaryGrid`, `renderTrainer`).
- **Status:** częściowo istnieje.
- **Wartość dla metody:** wysoka, jeśli skraca orientację i prowadzi do decyzji; niska jako CRM.
- **Ryzyko:** średnie — łatwo zbudować przeładowaną kartę albo eksponować informacje bez decyzji.
- **Decyzja:** **przeprojektować**, nie kopiować karty starego monolitu.
- **Priorytet:** **P0** jako wejście do briefu, nie jako osobny rozbudowany CRM.

### 4.2 Przygotowanie trenera do sesji

- **Stara aplikacja:** `renderTodaySession` pokazywała ostatnią sesję, Polar, Tanita, zadania, red flags, intake, plan domowy i automatyczną „rekomendację”; miała pre-check i post-note.
- **Bezpieczny runtime:** oblicza attention signals z ostatniej sesji, Polar i pre-check, ale pokazuje je oddzielnie od celu, ostatniej decyzji, guidance i sygnału klienta. `pre_session_checks` i `post_session_observations` są ładowane, lecz nie są widoczne ani zapisywalne w UI. `guidance_events` nie są ładowane do workspace.
- **Dane/API/moduły:** `clients`, `client_intakes`, `sessions`, `pre_session_checks`, `post_session_observations`, `training_load_observations`, `home_plans`, `home_plan_items`, `client_tasks`, docelowo read-only `guidance_events`; `assets/os/app.js`, `data.js`, `decision-support.js`, `ui/trainer.js`.
- **Dowód:** stary `renderTodaySession`, `savePreSessionCheck`, `savePostSessionNote`; bezpieczny `renderTrainerState()` i `getClientWorkspace()`.
- **Status:** częściowo istnieje; dane są bogatsze niż prezentacja.
- **Wartość dla metody:** najwyższa — bezpośrednio redukuje obciążenie pamięci i poprawia następną decyzję.
- **Ryzyko:** niskie/średnie — przeładowanie, fałszywa ważność sygnałów, automatyczna sugestia podszywająca się pod decyzję.
- **Decyzja:** **odzyskać jako mały brief trenera**, bez automatycznej rekomendacji.
- **Priorytet:** **P0; pierwszy PR**.

### 4.3 Zapis sesji

- **Stara aplikacja:** modal sesji zapisywał gotowość, VAS, sen, ćwiczenia, obserwację, decyzję, milestone i komunikat; typowy zapis kończył w lokalnym stanie.
- **Bezpieczny runtime:** formularz zapisuje bezpośrednio do `sessions`, obejmuje obserwację, decyzję trenera, podsumowanie i następny krok dla klienta oraz kontrolowaną publikację. Historia pokazuje obserwację i decyzję.
- **Dane/API/moduły:** `sessions`; `saveSession()`; `assets/os/data.js`, `app.js`, `ui/forms.js`, `ui/trainer.js`.
- **Dowód:** stary `openSessionModal` i `save()`; bezpieczny `sessionForm`, `onSaveSession`, `saveSession`.
- **Status:** istnieje, ale jest formularzem w sekcji, nie domknięciem decyzji w przepływie.
- **Wartość dla metody:** bardzo wysoka — to podstawowy ślad coached experiment.
- **Ryzyko:** średnie — dublowanie `post_session_observations`, zbyt wiele pól podczas sesji, publikacja niedopracowanej treści.
- **Decyzja:** **odzyskać i uprościć wokół kanonicznego zapisu sesji**; nie dodawać równoległego formularza post-session bez decyzji domenowej.
- **Priorytet:** **P0**, po briefie.

### 4.4 Polar, RPE i notatki

- **Stara aplikacja:** osobny ekran, historia i trend, auto-ocena tolerancji i decyzje `zwiększ/utrzymaj/zmniejsz/regeneracyjnie/obserwuj`; zapis lokalny.
- **Bezpieczny runtime:** ręczny zapis czasu, HR, strefy, RPE, notatki i client-safe summary do `training_load_observations`; ostatni odczyt zasila tylko attention signals; brak dashboardu trendu.
- **Dane/API/moduły:** `training_load_observations`; `saveTrainingLoad()`; `forms.js`, `trainer.js`, `decision-support.js`.
- **Dowód:** stary `renderPolar`, `assessLoadTolerance`, `generateWeeklyDecision`; bezpieczny `trainingLoadForm`, `measurementsSection`.
- **Status:** istnieje w minimalnej wersji.
- **Wartość dla metody:** średnia/wysoka, tylko gdy sygnał zmienia obciążenie lub zasila raport.
- **Ryzyko:** wysokie produktowo przy odtworzeniu automatycznej decyzji lub wearables dashboardu.
- **Decyzja:** **odzyskać tylko zwięzły kontekst i report-ready trend**; **odrzucić auto-decyzję i live integration**.
- **Priorytet:** **P1**; brak osobnego PR-a przed zamknięciem pętli sesji.

### 4.5 Pomiary ciała

- **Stara aplikacja:** rozbudowany Tanita screen, trendy, ręczne dane, parser PDF i przechowywanie PDF jako data URL w lokalnym stanie, automatyczne narracje raportowe.
- **Bezpieczny runtime:** wybrane wartości wpisywane ręcznie do `body_measurements`, interpretacja trenera, podsumowanie klienta i publikacja; brak uploadu, parsera i klient-facing dashboardu.
- **Dane/API/moduły:** `body_measurements`, opcjonalnie `client_documents`/Storage w przyszłości; `saveMeasurement()`, `measurementForm`, `measurementsSection`.
- **Dowód:** stary `renderMeasurements`, `readTanitaPdfFile`, `generateTanitaNarrative`; bezpieczny `assets/os/data.js` i `ui/forms.js`.
- **Status:** częściowo istnieje; właściwy minimalny zapis istnieje.
- **Wartość dla metody:** średnia — pomiar okresowy, nie rdzeń codziennej pracy.
- **Ryzyko:** wysokie przy dashboardzie liczb, automatycznej interpretacji i lokalnym PDF.
- **Decyzja:** **zachować minimalny zapis; przeprojektować tylko wtedy, gdy raport udowodni brak**. Odrzucić parser w runtime i automatyczną narrację.
- **Priorytet:** **P2**.

### 4.6 Obserwacje ruchowe

- **Stara aplikacja:** biblioteka testów, wynik, strony, ból przed/po, jakość, decyzja i automatyczna synteza diagnostyczna; głównie lokalny stan.
- **Bezpieczny runtime:** formularz obserwacji zapisuje do `assessment_results`; historia pokazuje wynik i interpretację. Brak biblioteki wyboru testów i automatycznej syntezy.
- **Dane/API/moduły:** `assessment_results`, potencjalnie trainer-owned `exercises`/katalog testów; `saveAssessment()`, `assessmentForm`, `assessmentsSection`.
- **Dowód:** stary `renderDiagnosticTests`, `renderDiagnosticTrainerSummary`; bezpieczny `assets/os/ui/forms.js` i `ui/trainer.js`.
- **Status:** częściowo istnieje.
- **Wartość dla metody:** wysoka na wejściu diagnostycznym, później selektywna.
- **Ryzyko:** wysokie — łatwo stworzyć pseudo-diagnozę, scoring lub przymus dokumentowania.
- **Decyzja:** **przeprojektować jako wybrane obserwacje wspierające hipotezę i decyzję**; odrzucić automatyczną syntezę.
- **Priorytet:** **P1** na diagnostyce, poza pierwszym PR-em.

### 4.7 Intake i onboarding

- **Stara aplikacja:** import CSV, automatyczne flagi/ryzyko/komunikacja/compliance, tworzenie klienta z ankiety, printable onboarding kit i lokalny kod panelu.
- **Bezpieczny runtime:** tabela i `saveIntake()` istnieją, ale nie ma formularza ani callbacku UI; `newClientForm` przechwytuje tylko część kontekstu. Dostęp klienta jest poprawnie oddzielony do Supabase Auth i narzędzia administracyjnego.
- **Dane/API/moduły:** `client_intakes`, `clients`; `saveIntake()`; brak ścieżki UI; dostęp: `client_users`, Edge Function i `tools/client-access-admin.*`.
- **Dowód:** stary `renderIntake`, `loadIntakeCsvFromInput`, `scoreIntakeRisk`, `renderOnboardingKitCard`; bezpieczny `assets/os/data.js`, `ui/forms.js`, `tools/client-access-admin.js`.
- **Status:** częściowo istnieje na poziomie danych, brak pełnego przepływu.
- **Wartość dla metody:** wysoka, bo ustala punkt startowy i granice; onboarding aplikacji sam w sobie ma niską wartość.
- **Ryzyko:** wysokie — automatyczne wnioski medyczne, raw payload, duplikaty klienta, odtworzenie lokalnych kodów.
- **Decyzja:** **przeprojektować jako selektywny trener-led intake**. Import powinien pozostać kontrolowanym procesem administracyjnym, nie swobodnym runtime flow. Odrzucić scoring ryzyka/compliance i kody lokalne.
- **Priorytet:** **P1**.

### 4.8 Plany domowe i zadania

- **Stara aplikacja:** bogaty edytor planu, przypisywanie z atlasu, aktywne/archiwalne zadania, pilot guidance, widok klienta i completion state; lokalna persystencja.
- **Bezpieczny runtime:** `home_plans` i `home_plan_items` zapisują się do Supabase; klient widzi tylko aktywny, opublikowany plan; check-in trafia przez RPC. `client_tasks` są ładowane, ale nie mają UI. Trainer workspace nie pokazuje client check-ins z `guidance_events`.
- **Dane/API/moduły:** `home_plans`, `home_plan_items`, `guidance_events`, opcjonalnie `client_tasks`; RPC `save_client_checkin()`; `data.js`, `forms.js`, `trainer.js`, `client.js`.
- **Dowód:** stary `renderHomePlanView`, `renderPortalDailyGuidance`; bezpieczny `plansSection`, `clientCheckinForm`, `client_portal_snapshot()`.
- **Status:** częściowo istnieje; bezpieczny rdzeń działa, pętla informacji jest przerwana po stronie trenera.
- **Wartość dla metody:** bardzo wysoka, jeśli plan reprezentuje papier-first guidance, a app zapisuje tylko późniejszy sygnał.
- **Ryzyko:** wysokie przy checklistach, pilotach engagement, zbyt wielu zadaniach i ekranie jako porannym przewodniku.
- **Decyzja:** **odzyskać pętlę guidance → offline action → minimal signal → trainer review**. Odrzucić streaks, przypomnienia i completion dashboard.
- **Priorytet:** **P0/P1**, po kanonicznym zapisie sesji.

### 4.9 Biblioteka ćwiczeń

- **Stara aplikacja:** duży atlas osadzony w HTML, seedy z kilku źródeł, filtry, QA, video URL, metadane mięśni i dodawanie do planu.
- **Bezpieczny runtime:** tabela `exercises` i `saveExercise()` istnieją, ale repository nie udostępnia listowania, a UI nie ma biblioteki. Home plan item można dodać ręcznie.
- **Dane/API/moduły:** `exercises`, `home_plan_items`; `saveExercise()`; brak trainer UI/list API.
- **Dowód:** stary `renderExerciseAtlas`, `getFilteredExerciseLibrary`, `addExerciseToActiveHomePlan`; bezpieczny `assets/os/data.js` i `homePlanItemForm`.
- **Status:** częściowo istnieje w schemacie, brak produktu.
- **Wartość dla metody:** średnia — skraca pracę trenera, ale nie tworzy decyzji sama.
- **Ryzyko:** bardzo wysokie przy skopiowaniu 700k monolitu, niezweryfikowanych seedów/linków i zamianie OS w bibliotekę fitness.
- **Decyzja:** **przeprojektować jako mały, trainer-only, zweryfikowany katalog**, z kontrolowanym importem i provenance. Nie odzyskiwać embedded seed code.
- **Priorytet:** **P2**.

### 4.10 Dokumenty

- **Stara aplikacja:** PDF Tanita przechowywany jako dane lokalne, dokumenty i raporty widoczne w portalu; brak bezpiecznego storage lifecycle.
- **Bezpieczny runtime:** `client_documents` i prywatny bucket `studio-las-client-documents` mają polityki; frontend zapisuje tylko metadata i nie uploaduje plików.
- **Dane/API/moduły:** `client_documents`, Supabase Storage, `saveDocumentMetadata()`, migracja `014`; brak UI uploadu.
- **Dowód:** stary `readFileAsDataUrl`, `openMeasurementPdf`; bezpieczny `supabase/README.md`, `014_private_client_documents.sql`, `assets/os/data.js`.
- **Status:** częściowo istnieje jako infrastruktura, brak przepływu produktu.
- **Wartość dla metody:** średnia/niska przed raportami; wysoka tylko dla konkretnych dokumentów procesu.
- **Ryzyko:** bardzo wysokie — dane zdrowotne, retencja, błędny path, public URL, rozjazd metadata/object.
- **Decyzja:** **przeprojektować po ustaleniu retencji i po udowodnieniu potrzeby**. Odrzucić base64/localStorage i publiczne bucket’y.
- **Priorytet:** **P2**.

### 4.11 Raport 12-tygodniowy

- **Stara aplikacja:** rozbudowany generator typów raportu, readiness score, automatyczne narracje, heurystyki, druk/PDF, historia; dodatkowo manualny PRD001 trainer-only snapshot — wszystko w monolicie i lokalnym stanie.
- **Bezpieczny runtime:** ręczny formularz tytułu/treści, audience, draft/published do `reports`; klient widzi tylko opublikowane raporty przez RPC. Brak wyboru dowodów, wzorców i approval workflow poza prostym published.
- **Dane/API/moduły:** `reports` plus źródła z sesji, guidance, pomiarów i obserwacji; `saveReport()`, `reportForm`, `reportsSection`, `client_portal_snapshot()`.
- **Dowód:** stary `renderReport`, `assessReportReadiness`, `generateTwelveWeeksReport`, `renderPrd001ReportSnapshot`; bezpieczny `ui/forms.js`, `ui/trainer.js`, `data.js`.
- **Status:** częściowo istnieje; bezpieczna publikacja istnieje, produktowa synteza jest zbyt prymitywna.
- **Wartość dla metody:** bardzo wysoka, ale zależna od jakości wcześniejszego śladu procesu.
- **Ryzyko:** bardzo wysokie — raport jako auto-werdykt, score readiness, raw export albo pewność bez dowodów.
- **Decyzja:** **przeprojektować jako evidence selection → trainer interpretation → client-safe approval → publication**. Odrzucić automatyczny generator, readiness score i automatyczne znaczenie.
- **Priorytet:** **P1**, nie pierwszy PR.

### 4.12 Portal klienta

- **Stara aplikacja:** lokalny kod `LAS-*`, sessionStorage unlock, trainer preview, proces, guidance, raporty, pomiary, dokumenty i „Dzisiaj”; szeroka logika w monolicie.
- **Bezpieczny runtime:** Supabase Auth AAL1 klienta, narrow `client_portal_snapshot()`, aktywny plan, minimalny check-in, ostatnie ustalenie, wybrane pomiary i opublikowane raporty. Brak dostępu do bazowych tabel i notes trenera.
- **Dane/API/moduły:** `client_users`, RPC snapshot/check-in, published `sessions`, `post_session_observations`, `home_plans/items`, `reports`, wybrane measurements; `ui/client.js`, `data.js`, migracje `012/018/019/021`.
- **Dowód:** stary `renderClientPortal`, `renderClientPortalGate`; bezpieczny `assets/os/ui/client.js`, `client_portal_snapshot()`.
- **Status:** istnieje jako bezpieczny rdzeń.
- **Wartość dla metody:** średnia/wysoka, jeśli klient widzi tylko spokojne ustalenie, guidance i raport; niska jako „aplikacja do używania”.
- **Ryzyko:** najwyższe przy rozszerzaniu projekcji bez client-safe review lub odtworzeniu lokalnego loginu.
- **Decyzja:** **zachować fundament; ulepszać dopiero po ustabilizowaniu trenerowego przepływu**. Odrzucić lokalne kody, trainer preview i raw dashboard.
- **Priorytet:** **P1** dla treści, bezpieczeństwo pozostaje zamknięte i nietykalne.

### 4.13 Komunikacja trener–klient

- **Stara aplikacja:** quick replies, `client_message`, client summary/next step i teksty do skopiowania; nie ma dowodu pełnego transportu wiadomości ani inboxu.
- **Bezpieczny runtime:** `sessions.client_summary`, `sessions.client_next_step`, `post_session_observations.client_message` i latest agreement w snapshot. Brak systemu wiadomości.
- **Dane/API/moduły:** `sessions`, `post_session_observations`, RPC snapshot; `data.js`, `ui/client.js`.
- **Dowód:** stary `renderQuickReplies`, `client_message`; bezpieczny `saveSession()`, `savePostSessionObservation()`, `latestAgreement` w portalu.
- **Status:** częściowo istnieje jako jednokierunkowe, publikowane ustalenie; prawdziwy komunikator nie istnieje.
- **Wartość dla metody:** wysoka jako jedno spokojne podsumowanie i następny krok; niska jako chat.
- **Ryzyko:** wysokie — powiadomienia, oczekiwanie natychmiastowej odpowiedzi, shadow medical record, większy screen time.
- **Decyzja:** **odzyskać jednokierunkowe, trener-approved ustalenie; odrzucić chat/inbox/push notifications**.
- **Priorytet:** **P1**, jako część zapisu sesji i portalu, nie osobny produkt.

### 4.14 Obsługa telefonu

- **Stara aplikacja:** responsive CSS i mobile drawer/menu; bardzo duża liczba ekranów i kontrolki w jednym pliku.
- **Bezpieczny runtime:** breakpointy 980/680/560 px, jednokolumnowe formularze poniżej 680 px, brak poziomego overflow; długi stacked workspace może nadal wymagać dużo przewijania. Brak dowodu testu zadaniowego na prawdziwym telefonie.
- **Dane/API/moduły:** cross-cutting; `assets/os/styles.css`, `ui/common.js`, `ui/trainer.js`, `ui/client.js`.
- **Dowód:** `assets/os/styles.css@446c522` (`@media max-width: 980px`, `680px`, `560px`).
- **Status:** częściowo istnieje; responsive code tak, zweryfikowana ergonomia nie.
- **Wartość dla metody:** wysoka operacyjnie, ale tylko dla krótkich zadań przed/po sesji.
- **Ryzyko:** średnie — desktopowa gęstość przeniesiona pionowo, scroll i formularze konkurujące z pracą trenera.
- **Decyzja:** **przeprojektować interakcje jako krótkie zadania, nie tworzyć osobnej aplikacji mobilnej**. Mobile acceptance ma obowiązywać każdy PR.
- **Priorytet:** **P0 jako kryterium jakości**, nie osobny pierwszy feature.

---

## 5. Docelowy przepływ — ocena krytyczna

Zaproponowany przepływ:

> klient → przygotowanie do sesji → zapis sesji → interpretacja i decyzja trenera → zadanie klienta → raport pokazujący wzorzec

jest dobrym szkieletem operatora, ale ma trzy wady:

1. Sugeruje liniową sekwencję ekranów zamiast powtarzalnej pętli decyzji.
2. Pomija działanie offline i późniejszy minimalny sygnał klienta.
3. Stawia „zapis sesji” przed interpretacją, mimo że zapis powinien rozdzielać obserwację, interpretację i decyzję oraz nie zmuszać trenera do pełnego logowania w trakcie spotkania.

### 5.1 Lepszy przepływ kanoniczny

> **kontekst klienta → brief przed sesją → coached experiment offline od ekranu → wybrana obserwacja → interpretacja i jawna decyzja trenera → papier-first guidance → działanie klienta offline → minimalny sygnał w app → przegląd na następnej sesji → powtarzalny wzorzec → raport zatwierdzony przez trenera → następna decyzja**

Ten przepływ jest zgodny z `docs/architecture/08_INFORMATION_FLOW.md` i z zasadą:

> Paper guides the morning.  
> Trainer gives meaning.  
> App records the signal.  
> Report shows the pattern.

### 5.2 Najlepszy punkt wejścia do odzyskania

Nie „lista klientów”, nie „nowa sesja” i nie „raport”. Najlepszym punktem wejścia jest **brief przed sesją po wybraniu klienta**.

Uzasadnienie risk-adjusted:

- używa danych, które secure repository już odczytuje;
- natychmiast poprawia jakość głównego produktu — trenera;
- nie wymaga nowej migracji ani nowego zapisu;
- ujawnia braki jakości danych zanim staną się częścią automatyzacji;
- ustanawia prawidłową hierarchię informacji dla wszystkich następnych PR-ów;
- można go łatwo usunąć lub uprościć;
- nie rozszerza powierzchni klienta ani bezpieczeństwa.

### 5.3 Leverage i kolejność

| Obszar | Wartość dla decyzji | Koszt | Ryzyko | Zależności | Leverage |
|---|---:|---:|---:|---:|---:|
| Brief przed sesją | bardzo wysoka | niski/średni | niski/średni | istniejące odczyty | **najwyższy** |
| Kanoniczne domknięcie sesji | bardzo wysoka | średni | średni | brief + decyzja o duplikatach | wysoki |
| Guidance i sygnał klienta | bardzo wysoka | średni | średni | zapis sesji | wysoki |
| Intake | wysoka | średni | wysoki | reguły zakresu | średni |
| Raport | bardzo wysoka | wysoki | bardzo wysoki | dobre sygnały i decyzje | średni teraz, wysoki później |
| Portal | średnia/wysoka | średni | bardzo wysoki | publikowane treści | średni |
| Atlas ćwiczeń | średnia | wysoki | wysoki | provenance/import | niski teraz |
| Dokumenty | średnia | wysoki | bardzo wysoki | retencja/Storage lifecycle | niski teraz |

---

## 6. Co odzyskujemy, przeprojektowujemy i odrzucamy

### Odzyskać

- kontekst „Sesja dzisiaj”, ale jako brief bez automatycznej decyzji;
- ręczny zapis sesji, obserwacji, decyzji i client-safe next step;
- papier-first home guidance z maksymalnie małą liczbą zadań;
- późniejszy minimalny sygnał klienta i jego przegląd przez trenera;
- wybrane obserwacje ruchowe, Polar/RPE i pomiary tylko jako report-ready evidence;
- raport jako trener-authored decision artifact;
- spokojny portal oparty na publikowanej projekcji.

### Przeprojektować

- kartę klienta jako kontekst decyzji, nie CRM;
- intake bez auto-diagnozy i scoringu;
- podział odpowiedzialności `sessions` / `post_session_observations`;
- podział `client_tasks` / `home_plan_items` / `guidance_events`;
- bibliotekę ćwiczeń jako mały, zweryfikowany katalog trenera;
- report workflow jako wybór dowodów, interpretacja, approval i publikacja;
- dokumenty dopiero z retencją i spójnym Storage lifecycle;
- mobile flow jako krótkie zadania przed/po sesji.

### Odrzucić

- cały historyczny HTML jako runtime lub źródło kodu do kopiowania;
- `localStorage` health/process persistence, kolejki i local-only success;
- lokalne kody `LAS-*`, trainer-preview unlock i stare Auth flow;
- automatyczne rekomendacje `zwiększ/utrzymaj/zmniejsz`, risk/compliance scoring i auto-diagnozę;
- readiness score raportu i automatyczne narracje jako znaczenie;
- Tanita PDF jako data URL w stanie przeglądarki;
- chat, inbox, push notifications, streaks, badges i engagement pilots;
- live wearables dashboard;
- szeroką migrację seedów ćwiczeń bez provenance i review;
- osobny SaaS, mobilną aplikację fitness lub klient-facing AI.

---

## 7. Plan odzyskania w małych PR-ach

Każdy PR ma być oparty na bezpiecznej linii `agent/security-architecture-hardening` lub jej późniejszym, świadomie zintegrowanym następcy. Żaden PR nie może przywracać produkcyjnego localStorage, osłabiać Auth/RLS/MFA, rozszerzać client-safe projekcji przypadkiem ani mieszać refaktoryzacji z wartością produktu.

### PR-01 — P0 — Trainer Session Brief — **pierwszy PR**

- **Wartość:** trener przed sesją widzi wyłącznie informacje, które mogą zmienić następną decyzję.
- **Zakres:** read-only brief po wyborze klienta: bezpieczeństwo/ograniczenia, aktualny fokus, ostatnia decyzja, ostatni wybrany sygnał klienta, obecne paper-first guidance i najbliższy review point. Dodać odczyt `guidance_events` do workspace tylko jeśli potrzebny do najnowszego check-in.
- **Zależności:** brak nowych danych; istniejące RLS i repository.
- **Ryzyko:** przeciążenie i fałszywa pewność; minimalizować przez limity, daty źródłowe, empty states i brak „rekomendacji”.
- **Tabele/moduły:** read-only `clients`, `sessions`, `pre_session_checks`, `post_session_observations`, `training_load_observations`, `home_plans`, `home_plan_items`, `guidance_events`, opcjonalnie `client_tasks`; `assets/os/data.js`, `ui/trainer.js`, ewentualnie `app.js`, testy statyczne.
- **Nie wolno zmieniać:** migracji, zapisów, Auth, MFA/AAL2, RLS, Edge Function, Storage, portal RPC, obecnych formularzy i produkcji.
- **Akceptacja:** brief pojawia się przed formularzami; każdy fakt ma typ i datę źródła; brak automatycznej decyzji; brak nowych write requestów; brak localStorage; sensowne empty states; używalność bez poziomego scrolla przy 360 px; istniejące testy kontraktu repozytorium nadal przechodzą; diff nie zawiera schema/security zmian.

### PR-02 — P0 — Canonical Session Closure

- **Wartość:** jedna sesja zostawia jeden czytelny ślad: obserwacja → decyzja trenera → client-safe summary → następny krok.
- **Zakres:** uporządkować obecny `sessionForm` wokół domknięcia sesji; `sessions` pozostaje kanonicznym zapisem nowej sesji. `post_session_observations` nie otrzymuje drugiego równoległego formularza, dopóki nie zostanie zdefiniowana jego odrębna odpowiedzialność.
- **Zależności:** PR-01 oraz potwierdzenie z trenerem minimalnego zestawu pól.
- **Ryzyko:** duplikaty semantyczne, dokumentowanie w trakcie relacji 1:1, przypadkowa publikacja.
- **Tabele/moduły:** `sessions`; `data.js`, `app.js`, `ui/forms.js`, `ui/trainer.js`.
- **Nie wolno zmieniać:** schematu, automatycznego publikowania, pre/post tabel jako równoległych źródeł, Polar/pomiarów, portalu poza istniejącym snapshotem.
- **Akceptacja:** jeden submit daje jeden rekord w Supabase; reload pokazuje identyczny zapis; client-safe pola są jawnie opt-in; zapis błędny nie ma lokalnego fallbacku; obsługa telefonu i klawiatury; brak automatycznej interpretacji.

### PR-03 — P0/P1 — Paper Guidance and Signal Review

- **Wartość:** trener przypisuje małe guidance na papier, klient działa offline, a późniejszy sygnał wraca do kontekstu następnej sesji.
- **Zakres:** uporządkować aktywny plan i maksymalnie mały zestaw zadań; pokazać trenerowi check-ins z `guidance_events`; zachować istniejący klient-safe RPC.
- **Zależności:** PR-02; decyzja, że `home_plan_items` reprezentują guidance, `guidance_events` sygnał, a `client_tasks` tylko wewnętrzne follow-upy administracyjne/trenerskie albo zostają poza zakresem.
- **Ryzyko:** habit tracker, screen-first morning, compliance scoring.
- **Tabele/moduły:** `home_plans`, `home_plan_items`, `guidance_events`; `data.js`, `trainer.js`, `client.js`, `forms.js`, RPC snapshot/check-in.
- **Nie wolno zmieniać:** reminders, streaks, badges, push, automatycznej progresji, szerokiej codziennej ankiety.
- **Akceptacja:** guidance jest publikowane przez trenera; klient widzi tylko aktywne pozycje; check-in pozostaje krótki i po działaniu offline; trener widzi sygnał z kontekstem; brak wskaźnika „compliance”.

### PR-04 — P1 — Diagnostic Entry and Selective Intake

- **Wartość:** zapisuje punkt startowy potrzebny do pierwszej hipotezy i bezpiecznej kwalifikacji.
- **Zakres:** mały trainer-only intake oparty na `client_intakes`; ręczne podsumowanie, cel, ważne flagi, pierwszy fokus. Import CSV poza zwykłym runtime albo jako osobny kontrolowany admin workflow.
- **Zależności:** uzgodniony minimalny zakres danych i relacja z polami `clients`.
- **Ryzyko:** auto-diagnoza, raw payload, nadmiar danych wrażliwych, duplikaty klienta.
- **Tabele/moduły:** `client_intakes`, `clients`; `data.js`, `forms.js`, `app.js`, `trainer.js`.
- **Nie wolno zmieniać:** scoringu ryzyka/compliance, generowania diagnoz, tworzenia klienta przez heurystykę, lokalnych access codes.
- **Akceptacja:** trener tworzy/odczytuje intake w Supabase; system nie wyprowadza diagnozy ani rekomendacji; rozróżnia raw trainer-only od client-safe summary; brak logowania payloadu.

### PR-05 — P1 — Report Evidence and Trainer Approval

- **Wartość:** raport pokazuje wzorzec oparty na wybranych dowodach i kończy się jawną decyzją trenera.
- **Zakres:** trener wybiera report-relevant evidence, zapisuje własną interpretację, tworzy working version, jawnie publikuje client-safe report. Bez PDF designu w pierwszym kroku.
- **Zależności:** PR-02, PR-03, najlepiej PR-04; decyzja o minimalnych stanach draft/approved/published w ramach istniejącego modelu lub osobny późniejszy schema PR.
- **Ryzyko:** auto-meaning, raw data export, publikacja draftu, nieudowodnione claimy.
- **Tabele/moduły:** `reports` plus read-only sesje/guidance/measurements/assessments; `data.js`, `forms.js`, `trainer.js`, portal snapshot.
- **Nie wolno zmieniać:** automatycznego generatora, readiness score, automatycznej publikacji, AI verdict, marketingowego PDF.
- **Akceptacja:** finalna treść jest zawsze authored/approved przez trenera; system wskazuje źródła bez nadawania znaczenia; klient widzi tylko published client audience; brak raw trainer notes.

### PR-06 — P1 — Client-safe Current Direction

- **Wartość:** klient widzi jedno spokojne ustalenie, aktywne guidance i zatwierdzony raport, bez dashboardu.
- **Zakres:** ulepszyć hierarchię istniejącego portalu po ustabilizowaniu publikowanych danych trenera; ewentualne zmiany RPC tylko w osobnym, minimalnym schema PR z testami izolacji.
- **Zależności:** PR-03 i PR-05.
- **Ryzyko:** rozszerzenie client projection, screen time, przypadkowe trainer-only data.
- **Tabele/moduły:** istniejące RPC, `ui/client.js`, ewentualnie osobny forward migration/test.
- **Nie wolno zmieniać:** Auth modelu, AAL1 kontraktu klienta, bezpośrednich odczytów tabel, local codes, chat/push.
- **Akceptacja:** tylko published client-safe data; portal można zrozumieć w mniej niż minutę; brak raw metrics dashboard; testy cross-client isolation w repo pozostają wymagane bez ponownego otwierania zamkniętego audytu.

### PR-07 — P2 — Selective Measurement and Observation History

- **Wartość:** trener wybiera sygnały, które realnie wspierają decyzję lub raport.
- **Zakres:** spokojna historia obserwacji ruchowych, Polar/RPE i okresowych pomiarów z opisem trenera; bez live wearables i bez automatycznej narracji.
- **Zależności:** potrzeby ujawnione przez PR-01 i PR-05.
- **Ryzyko:** dashboard biohackingu, pseudo-diagnoza, false precision.
- **Tabele/moduły:** `assessment_results`, `training_load_observations`, `body_measurements`; istniejące forms/repository/UI.
- **Nie wolno zmieniać:** auto progression, scoring, live ingestion, klient-facing raw trends.
- **Akceptacja:** każda prezentowana wartość ma decyzję/report use; trener może pominąć pomiar; klient-safe summary jest oddzielne od trainer interpretation.

### PR-08 — P2 — Curated Trainer Exercise Library

- **Wartość:** skraca przypisanie zweryfikowanego guidance bez zamiany systemu w katalog fitness.
- **Zakres:** list/read/select istniejących ćwiczeń, mały kontrolowany import po provenance/QA, przypisanie do planu.
- **Zależności:** PR-03; osobny audyt danych seed.
- **Ryzyko:** ogromny zakres, słabe źródła, nieaktualne URL, medyczne claims, UI-first drift.
- **Tabele/moduły:** `exercises`, `home_plan_items`; `data.js`, nowy mały trainer-only UI.
- **Nie wolno zmieniać:** kopiowania seedów z monolitu, masowego importu bez raportu QA, klientowej przeglądarki biblioteki.
- **Akceptacja:** każdy rekord ma owner/source/quality; tylko reviewed ćwiczenia mogą być publikowane; brak lokalnego seed merge w runtime.

### PR-09 — P2 — Private Documents Lifecycle

- **Wartość:** przechowuje wyłącznie konkretne dokumenty potrzebne w procesie lub raporcie.
- **Zakres:** upload + metadata + odczyt + kontrolowana publikacja/usunięcie, po ustaleniu retencji.
- **Zależności:** zasady retencji/RODO, Storage path contract, istniejąca migracja `014` i testy.
- **Ryzyko:** najwyższe w planie — health data leakage, orphaned objects, błędna publikacja.
- **Tabele/moduły:** `client_documents`, private Storage bucket, osobny storage module/UI.
- **Nie wolno zmieniać:** public bucket, base64/localStorage, stałych public URL, automatycznej publikacji.
- **Akceptacja:** pełny lifecycle metadata/object, owner-scoped path, MIME/size checks, jawna audience/publish, retention behavior, brak public URL.

---

## 8. Jednoznacznie: czego teraz nie robić

1. Nie przywracać `studio-management-os-3.0.html` jako aplikacji.
2. Nie kopiować funkcji z monolitu bez ponownego zdefiniowania odpowiedzialności domenowej.
3. Nie otwierać Product Recovery PR do `main` przed osobną decyzją o historii Git.
4. Nie zaczynać od raportu, atlasu, dokumentów ani portalu.
5. Nie tworzyć migracji, dopóki pierwszy read-only slice nie pokaże realnego braku modelu.
6. Nie dodawać drugiego źródła prawdy, offline queue ani „sukcesu” przed potwierdzeniem Supabase.
7. Nie odtwarzać auto-decyzji, scoringu, auto-raportów, lokalnych kodów ani trainer preview.
8. Nie dodawać komunikatora, powiadomień, wearable ingestion, gamifikacji ani klient-facing AI.
9. Nie zmieniać MFA/AAL2, RLS, Storage policies, Edge Function ani produkcji w Product Recovery PR-ach bez osobnego, koniecznego i dowodowego zakresu.
10. Nie utożsamiać istniejącej tabeli z zatwierdzonym obiektem produktu.

---

## 9. Kryterium rozpoczęcia implementacji

Implementacja PR-01 może ruszyć dopiero po akceptacji dwóch decyzji:

1. `agent/security-architecture-hardening@446c522` pozostaje bazą roboczą Product Recovery, a integracja z `main` jest osobnym zadaniem.
2. Pierwszy slice jest read-only Trainer Session Brief; nie raport, nie atlas, nie portal i nie nowy schema.

Nie wymaga to ponownego audytu bezpieczeństwa ani dostępu do produkcji.

---

## 10. Kontrola zakresu tego audytu

- Zmieniony artefakt repozytorium: wyłącznie ten dokument.
- Kod aplikacji: bez zmian.
- Migracje i schema: bez zmian.
- Deployment: niewykonany.
- Supabase: brak odczytów i zapisów do środowisk; analizowano wyłącznie kod repozytorium.
- Produkcja: nietknięta.
- Staging: nietknięty.
- Testy bezpieczeństwa: niepowtarzane.
- Stary HTML: użyty wyłącznie jako historyczny materiał dowodowy.
- Sekrety, JWT, hasła, klucze i dane klientów: nieodczytywane, nieujawnione i niezapisane.

## 11. Ostateczna rekomendacja

Studio Las OS powinien być odzyskiwany od decyzji trenera, nie od powierzchni starej aplikacji.

Pierwszy PR ma odpowiedzieć na jedno pytanie:

> Co trener powinien zobaczyć przed następną sesją, żeby pamiętać mniej, rozumieć więcej i samodzielnie podjąć lepszą decyzję?

Jeżeli ten slice nie poprawi realnego przygotowania trenera, dalsze odzyskiwanie ekranów należy zatrzymać. Jeżeli poprawi, stanie się kręgosłupem dla zapisu sesji, paper-first guidance, sygnałów klienta i późniejszego raportu.
