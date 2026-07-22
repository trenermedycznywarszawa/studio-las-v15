# Studio Las OS — Product Recovery Execution Plan

**Status dokumentu:** ACTIVE  
**Wersja:** 1.0  
**Data utworzenia:** 2026-07-22  
**Aktualny etap:** G0 — przyjęcie dokumentacji i ustalenie kanonicznej linii Git  
**Następny PR implementacyjny:** PR-01 — read-only Trainer Session Brief

---

## 1. Rola dokumentu

Ten plik jest operacyjnym źródłem prawdy dla realizacji Product Recovery Studio Las OS. Odpowiada na pięć pytań:

1. Co zostało zakończone i na podstawie jakiego dowodu?
2. Co robimy teraz?
3. Co robimy później i dlaczego w tej kolejności?
4. Jak rozpoznajemy, że dany etap jest naprawdę zakończony?
5. Czego świadomie nie budujemy?

Ten dokument nie zastępuje Constitution, architektury ani audytu. Nie powtarza ich uzasadnień. Łączy zatwierdzone decyzje w jeden kontrolowany plan wykonania.

### Hierarchia źródeł prawdy

1. `docs/constitution/` — tożsamość, granice i zasady nienegocjowalne.
2. `docs/product/` oraz `docs/architecture/` — metoda, przepływ informacji i odpowiedzialności systemu.
3. `docs/product/PRODUCT_RECOVERY_AUDIT_2026-07-22.md` — dowody z historii Git i porównanie starego monolitu z bezpiecznym runtime.
4. Ten dokument — kolejność realizacji, status, bramki i kryteria ukończenia.
5. Kod i testy w konkretnym PR — dowód wykonania, nigdy nowa definicja produktu.

W razie sprzeczności wyższa warstwa ma pierwszeństwo. Kod nie może samodzielnie zmienić metody Studio Las.

---

## 2. Zasady prowadzenia planu

### 2.1 Oznaczenia

- `[ ]` — niewykonane albo nieudowodnione.
- `[x]` — wykonane i poparte linkiem do PR-a, commita, testu lub dokumentu.
- `NOW` — dokładnie jedno aktywne zadanie na poziomie programu.
- `BLOCKED` — praca zatrzymana; przy zadaniu musi być zapisany blocker i decyzja potrzebna do odblokowania.
- `REJECTED` — świadomie wyłączone z produktu; nie wraca do backlogu bez zmiany decyzji produktowej.

### 2.2 Reguły aktualizacji

1. Nie zaznaczamy zadania jako wykonane tylko dlatego, że kod został napisany.
2. Funkcja jest zakończona dopiero po spełnieniu kryteriów akceptacji i zapisaniu dowodu.
3. Na raz realizujemy jeden PR produktowy. Wyjątkiem jest niezależna poprawka krytyczna bezpieczeństwa lub awarii.
4. Następny PR nie rozpoczyna się przed zamknięciem zależności poprzedniego etapu.
5. Każdy PR aktualizuje odpowiedni fragment tego planu albo wskazuje, dlaczego aktualizacja nie jest potrzebna.
6. Nowy pomysł trafia najpierw do oceny wartości, ryzyka i zgodności z Constitution — nie bezpośrednio do realizacji.
7. Odkrycie braku danych nie oznacza automatycznie nowej tabeli. Najpierw sprawdzamy istniejący model i odpowiedzialność domenową.
8. Nie utrzymujemy drugiej równoległej listy zadań dla Product Recovery.

### 2.3 Minimalny dowód ukończenia

Każde odhaczone zadanie musi zawierać co najmniej jeden z poniższych dowodów:

- numer i link do scalonego PR-a;
- pełny hash commita;
- wynik odpowiedniego testu z datą;
- ścieżkę zatwierdzonego dokumentu decyzyjnego;
- wynik testu zadaniowego wykonanego przez Damiana, jeżeli kryterium dotyczy realnej pracy trenera.

---

## 3. Stałe decyzje programu

Poniższych decyzji nie negocjujemy ponownie w każdym PR-ze:

- [x] Bezpieczny runtime z `446c522ca5c61a9ad01808e7a03ea1ae9138527c` jest jedynym fundamentem technicznym.
- [x] Supabase jest jedynym źródłem prawdy dla danych aplikacyjnych.
- [x] Historyczny `studio-management-os-3.0.html@c7206dc` jest wyłącznie materiałem dowodowym.
- [x] Etap bezpieczeństwa jest `CLOSED / PASS`; 25/25 testów uwierzytelnionych przeszło.
- [x] MFA/AAL2, RLS, Edge Function, Storage i izolacja klientów nie są ponownie projektowane w Product Recovery.
- [x] Rdzeniem produktu jest pętla decyzji trenera, nie liczba ekranów.
- [x] Pierwszym PR-em implementacyjnym będzie read-only Trainer Session Brief.
- [x] Nie dodajemy nowego schematu, dopóki pierwszy read-only slice nie udowodni rzeczywistego braku modelu.
- [x] Każdy przepływ ma respektować zasadę: `Paper guides the morning. Trainer gives meaning. App records the signal. Report shows the pattern.`

### Kanoniczna pętla produktu

> kontekst klienta → brief przed sesją → praca offline od ekranu → wybrana obserwacja → interpretacja i decyzja trenera → paper-first guidance → działanie klienta offline → minimalny sygnał → przegląd na kolejnej sesji → wzorzec → raport zatwierdzony przez trenera → następna decyzja

---

## 4. Stan początkowy i wykonane prace

- [x] Constitution v1.0 ustanawia nadrzędne granice produktu.
- [x] Warstwa Product opisuje metodę, client journey, coaching i pomiary.
- [x] PR #13 został scalony; merge commit `1d5362e8f40096676532ef3f28908e2fe7df8196`.
- [x] Końcowa regresja bezpieczeństwa została zapisana w `446c522ca5c61a9ad01808e7a03ea1ae9138527c`.
- [x] Backup danych aplikacyjnych został zweryfikowany; nie jest traktowany jako pełny test odtworzenia platformy Supabase.
- [x] Audyt Product Recovery został wykonany na podstawie kodu i historii Git.
- [x] Audyt zapisano w `docs/product/PRODUCT_RECOVERY_AUDIT_2026-07-22.md`.
- [x] Draft PR #14 otwarto z dokładnie jednym dokumentem; commit `da967b8fe378dded483882856b2ea666a3226446`.
- [ ] Draft PR #14 został merytorycznie zaakceptowany.
- [ ] Draft PR #14 został scalony do zatwierdzonej bazy.
- [ ] Ten Execution Plan został scalony i ustanowiony jako operacyjna lista kontrolna.

---

## 5. NOW — G0: jedna kanoniczna linia Git

### Problem

`main` i bezpieczna linia `agent/security-architecture-hardening@446c522` mają rozbieżną historię. Rozpoczęcie kolejnych funkcji na tymczasowej gałęzi `agent/*` bez decyzji integracyjnej zwiększa ryzyko fałszywych diffów, konfliktów i utraty czytelności historii.

### Decyzja wykonawcza

Pierwszy PR implementacyjny pozostaje PR-01 Trainer Session Brief, ale przed rozpoczęciem kodowania trzeba wskazać jedną kanoniczną bazę Product Recovery. Nie wolno domyślnie użyć `main` ani bezterminowo rozwijać produktu na gałęzi audytowej.

### Checklista G0

- [ ] **NOW G0.1** — zweryfikować pełny diff i jedyny commit istniejący wyłącznie na `main` względem bezpiecznej linii.
- [ ] G0.2 — sklasyfikować commit z `main`: zachować, odtworzyć, zastąpić albo odrzucić; zapisać dowód i uzasadnienie.
- [ ] G0.3 — wybrać strategię integracji o najmniejszym ryzyku: uporządkowanie `main` albo jawna tymczasowa gałąź kanoniczna Product Recovery.
- [ ] G0.4 — utworzyć osobny Draft PR integracyjny, jeśli zmiana historii lub zawartości jest potrzebna; bez zmian funkcjonalnych.
- [ ] G0.5 — potwierdzić, że kanoniczna baza zawiera `446c522`, audyt i ten plan, a diff nie ukrywa obcych zmian.
- [ ] G0.6 — zapisać nazwę i SHA kanonicznej bazy poniżej.
- [ ] G0.7 — dopiero po G0.1–G0.6 rozpocząć PR-01.

**Kanoniczna gałąź Product Recovery:** `DO USTALENIA`  
**Kanoniczny SHA:** `DO USTALENIA`  
**Dowód decyzji:** `DO UZUPEŁNIENIA`

### Kryterium zakończenia G0

Istnieje jedna jawnie wskazana baza, z której można utworzyć mały PR-01 bez 122 niezwiązanych commitów, bez utraty bezpiecznej architektury i bez dwuznaczności, która gałąź reprezentuje najnowszy produkt.

---

## 6. Roadmapa Product Recovery

### M1 — Rdzeń pracy trenera — P0

#### PR-01 — Trainer Session Brief

**Cel:** przed sesją pokazać trenerowi tylko informacje mogące zmienić jego decyzję.

- [ ] Zakres i hierarchia informacji zatwierdzone.
- [ ] Read-only brief zaimplementowany z istniejących danych Supabase.
- [ ] Każdy fakt ma źródło i datę.
- [ ] Brak automatycznej rekomendacji, nowego zapisu i migracji.
- [ ] Empty states są czytelne i nie sugerują nieistniejących danych.
- [ ] Widok działa bez poziomego przewijania przy szerokości 360 px.
- [ ] Testy repozytorium przechodzą.
- [ ] Damian wykonuje test zadaniowy przed rzeczywistą lub symulowaną sesją.
- [ ] PR scalony do kanonicznej bazy.

**Kryterium wyniku:** Damian w mniej niż 60 sekund potrafi odpowiedzieć: co jest ważne, co wydarzyło się ostatnio i co wymaga jego decyzji — bez przeszukiwania oddzielnych ekranów.

#### PR-02 — Canonical Session Closure

**Cel:** jedna sesja pozostawia jeden czytelny ślad: obserwacja → interpretacja → decyzja → client-safe next step.

- [ ] Minimalny zestaw pól potwierdzony z Damianem.
- [ ] Odpowiedzialność `sessions` i `post_session_observations` rozdzielona bez duplikowania zapisu.
- [ ] Jeden submit tworzy jeden kanoniczny rekord Supabase.
- [ ] Publikacja treści klientowi jest jawna i domyślnie bezpieczna.
- [ ] Brak localStorage i pozornego sukcesu przed potwierdzeniem zapisu.
- [ ] Zapis po sesji jest używalny na telefonie.
- [ ] Test odczytu po ponownym załadowaniu potwierdza identyczny stan.
- [ ] PR scalony do kanonicznej bazy.

**Kryterium wyniku:** domknięcie sesji nie odrywa trenera od relacji i pozostawia wystarczający materiał do kolejnej decyzji oraz raportu.

#### PR-03 — Paper Guidance and Signal Review

**Cel:** trener ustala małe zadanie prowadzące pracę offline; klient przekazuje później minimalny sygnał, który wraca do następnego briefu.

- [ ] Kanoniczne role `home_plan_items`, `guidance_events` i `client_tasks` zapisane.
- [ ] Trener publikuje tylko aktywne paper-first guidance.
- [ ] Klient widzi małą liczbę aktualnych pozycji, bez dashboardu i gamifikacji.
- [ ] Check-in następuje po działaniu offline i pozostaje minimalny.
- [ ] Trener widzi sygnał klienta z datą i kontekstem.
- [ ] Brak compliance score, streaków, przypomnień push i automatycznej progresji.
- [ ] Pętla PR-01 → PR-02 → PR-03 przetestowana end-to-end.
- [ ] PR scalony do kanonicznej bazy.

**Kryterium zakończenia M1:** bezpieczna aplikacja obsługuje pełną pętlę jednej decyzji trenera od przygotowania, przez sesję i guidance, do sygnału widocznego przed kolejną sesją.

---

### M2 — Punkt startowy i dowód postępu — P1

#### PR-04 — Diagnostic Entry and Selective Intake

- [ ] Minimalny zakres intake uzgodniony; brak pól „na wszelki wypadek”.
- [ ] Cel, ograniczenia, flagi i pierwszy fokus są zapisywane w Supabase.
- [ ] Surowe dane trenera są oddzielone od client-safe summary.
- [ ] System nie stawia diagnozy, nie liczy ryzyka i nie generuje rekomendacji.
- [ ] Import legacy pozostaje poza zwykłym runtime albo ma osobny kontrolowany proces.
- [ ] PR scalony do kanonicznej bazy.

#### PR-05 — Report Evidence and Trainer Approval

- [ ] Raport korzysta wyłącznie z zatwierdzonych, report-relevant evidence.
- [ ] System wskazuje źródła; trener tworzy znaczenie i wniosek.
- [ ] Draft, zatwierdzenie i publikacja są rozdzielone.
- [ ] Klient widzi tylko wersję published/client-safe.
- [ ] Brak automatycznej narracji, readiness score i AI verdict.
- [ ] Damian zatwierdza użyteczność raportu do decyzji „co dalej po 12 tygodniach”.
- [ ] PR scalony do kanonicznej bazy.

**Kryterium zakończenia M2:** system potrafi połączyć punkt startowy, decyzje z kolejnych sesji i wybrane sygnały w raport, którego autorem i interpretatorem pozostaje trener.

---

### M3 — Spokojna projekcja klienta — P1

#### PR-06 — Client-safe Current Direction

- [ ] Portal pokazuje jedno aktualne ustalenie, aktywne guidance i opublikowany raport.
- [ ] Klient rozumie bieżący kierunek w mniej niż 60 sekund.
- [ ] Brak surowych notatek trenera i niepublikowanych danych.
- [ ] Brak bezpośrednich odczytów tabel; zachowany wąski kontrakt RPC.
- [ ] Cross-client isolation pozostaje obowiązkowym testem regresyjnym.
- [ ] Brak chatu, inboxu, push i dashboardu metryk.
- [ ] PR scalony do kanonicznej bazy.

**Kryterium zakończenia M3:** portal wspiera ustalenie z trenerem, lecz nie staje się osobnym produktem wymagającym codziennej obsługi.

---

### M4 — Funkcje selektywne, wyłącznie po udowodnieniu potrzeby — P2

#### PR-07 — Selective Measurement and Observation History

- [ ] PR-01 i PR-05 udowodniły, które sygnały są realnie potrzebne.
- [ ] Historia obejmuje tylko pomiary i obserwacje wspierające decyzję lub raport.
- [ ] Brak live wearables, false precision i auto-interpretacji.
- [ ] PR scalony do kanonicznej bazy.

#### PR-08 — Curated Trainer Exercise Library

- [ ] PR-03 udowodnił potrzebę biblioteki.
- [ ] Każde ćwiczenie ma źródło, właściciela i status review.
- [ ] Tylko zweryfikowane ćwiczenia mogą wejść do guidance.
- [ ] Brak masowego importu seedów i klientowej przeglądarki fitness.
- [ ] PR scalony do kanonicznej bazy.

#### PR-09 — Private Documents Lifecycle

- [ ] Istnieje zaakceptowana polityka retencji i usuwania.
- [ ] Storage path, MIME, rozmiar, audience i publikacja mają jawny kontrakt.
- [ ] Metadata i obiekt mają pełny, spójny lifecycle.
- [ ] Brak public bucket, base64 i trwałych publicznych URL.
- [ ] Testy autoryzacji i izolacji przechodzą.
- [ ] PR scalony do kanonicznej bazy.

**Kryterium zakończenia M4:** każda funkcja P2 istnieje dlatego, że wcześniejsza praca udowodniła jej wartość — nie dlatego, że była widoczna w starej aplikacji.

---

## 7. Bramka każdego PR-a

### Definition of Ready

- [ ] Jedno zdanie opisuje wartość dla trenera lub klienta.
- [ ] Zakres i zakazany zakres są zapisane.
- [ ] Znane są tabele, API i moduły.
- [ ] Zależności od wcześniejszych PR-ów są zamknięte.
- [ ] Kryteria akceptacji obejmują funkcję, bezpieczeństwo i telefon.
- [ ] Wiadomo, jak sprawdzimy wartość w realnym przepływie Studio Las.

### Definition of Done

- [ ] Kryteria akceptacji przechodzą.
- [ ] Supabase pozostaje jedynym źródłem prawdy.
- [ ] Brak produkcyjnego localStorage i danych demonstracyjnych w runtime.
- [ ] Brak niezamierzonej zmiany Auth, MFA/AAL2, RLS, Storage i client-safe projection.
- [ ] Testy automatyczne i właściwy test manualny przechodzą.
- [ ] Widok jest używalny na telefonie w zadaniu, dla którego powstał.
- [ ] Damian potwierdza użyteczność, jeśli PR zmienia pracę trenera lub klienta.
- [ ] PR ma mały, audytowalny diff i nie zawiera obcej refaktoryzacji.
- [ ] Ten plan zawiera aktualny status i dowód.
- [ ] PR został scalony do kanonicznej bazy; dopiero wtedy rozpoczyna się następny PR.

---

## 8. Rejestr dowodów i decyzji

| ID | Stan | Decyzja lub wynik | Dowód |
|---|---|---|---|
| SEC-01 | DONE | Bezpieczeństwo CLOSED / PASS, 25/25 | `446c522ca5c61a9ad01808e7a03ea1ae9138527c` |
| AUD-01 | DONE | Audyt odzyskania produktu wykonany | Draft PR #14, `da967b8fe378dded483882856b2ea666a3226446` |
| GOV-01 | NOW | Ustalić kanoniczną linię Git | Do uzupełnienia po G0 |
| PR-01 | NOT STARTED | Trainer Session Brief | — |
| PR-02 | NOT STARTED | Canonical Session Closure | — |
| PR-03 | NOT STARTED | Paper Guidance and Signal Review | — |
| PR-04 | NOT STARTED | Diagnostic Entry and Selective Intake | — |
| PR-05 | NOT STARTED | Report Evidence and Trainer Approval | — |
| PR-06 | NOT STARTED | Client-safe Current Direction | — |
| PR-07 | NOT STARTED | Selective Measurement and Observation History | — |
| PR-08 | NOT STARTED | Curated Trainer Exercise Library | — |
| PR-09 | NOT STARTED | Private Documents Lifecycle | — |

---

## 9. Rejestr świadomych odrzuceń

Poniższe elementy mają status `REJECTED`, a nie „kiedyś”:

- stary monolit jako runtime lub źródło kodu do kopiowania;
- localStorage jako persystencja danych zdrowotnych i procesu;
- lokalne kody `LAS-*` oraz stare logowanie klienta;
- auto-diagnoza, scoring, automatyczne rekomendacje i automatyczne znaczenie;
- raport generowany bez autorstwa i zatwierdzenia trenera;
- gamifikacja, streaki, odznaki i compliance score;
- chat, inbox i push notifications;
- live wearable ingestion i dashboard biohackingu;
- klient-facing AI;
- osobna aplikacja mobilna fitness;
- SaaS dla innych trenerów;
- funkcje zwiększające czas ekranowy bez wpływu na decyzję lub raport.

Powrót któregokolwiek elementu wymaga osobnej decyzji zmieniającej Product Constitution lub Product Recovery Audit. Nie może wejść „przy okazji” innego PR-a.

---

## 10. Następna czynność

Nie implementować jeszcze Trainer Session Brief.

Następne polecenie ma wykonać wyłącznie **G0 — Canonical Git Line Decision**: porównać `main` z bezpieczną linią, rozstrzygnąć los jedynego commita po stronie `main`, wskazać kanoniczną bazę i przygotować minimalny, niedestrukcyjny sposób integracji. Bez zmian kodu aplikacji, Supabase, środowisk i bezpieczeństwa.

Po udowodnionym zamknięciu G0 następnym i jedynym aktywnym zakresem staje się PR-01.
