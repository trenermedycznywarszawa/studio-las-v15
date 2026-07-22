# Studio Las OS — Product Recovery Execution Plan

**Status dokumentu:** ACTIVE  
**Wersja:** 1.2  
**Data utworzenia:** 2026-07-22  
**Aktualny etap:** PR-01 — read-only Trainer Session Brief  
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
- [x] PR #14 został merytorycznie zaakceptowany i scalony; merge commit `6a105b48d00fbf848d8181b5e7bc0e83e31b3085`.
- [x] PR #15 został scalony; merge commit `f914a2f9ce65d97f0bcfb2e50ba2522c3398a225`.
- [x] Ten Execution Plan jest operacyjną listą kontrolną na kanonicznej linii Product Recovery.

---

## 5. DONE — G0: jedna kanoniczna linia Git

### Problem

`main` i bezpieczna linia `agent/security-architecture-hardening@446c522` mają rozbieżną historię. Rozpoczęcie kolejnych funkcji na tymczasowej gałęzi `agent/*` bez decyzji integracyjnej zwiększa ryzyko fałszywych diffów, konfliktów i utraty czytelności historii.

### Decyzja wykonawcza

Kanoniczną bazą rozwoju zostaje jawna gałąź `product-recovery`, utworzona z bezpiecznego SHA `f914a2f9ce65d97f0bcfb2e50ba2522c3398a225`. Integracja do `main` pozostaje odłożona: istniejący PR #9 nadal jest Draftem, a jego bramka produkcyjna odwołuje się do otwartego issue #12 dotyczącego kwalifikowanej oceny RODO. Rozwój produktu może trwać bez deploymentu, produkcji i realnych danych klientów.

### Checklista G0

- [x] G0.1 — pełny diff zweryfikowany; `main` ma jeden własny commit `e371c7694f2c30b3bcf1a1bbbab5d3a9ac7b68ba`.
- [x] G0.2 — commit `e371c76` zachowujemy; dodaje wyłącznie `noindex, nofollow` do 27 stron podglądu v16 i nie należy do runtime Studio Las OS.
- [x] G0.3 — wybrano jawną gałąź kanoniczną `product-recovery`; brak force-pusha i przepisywania historii.
- [x] G0.4 — nie tworzono duplikatu integracyjnego PR-a; istniejący PR #9 pozostaje Draftem do `main` ze względu na otwartą bramkę #12.
- [x] G0.5 — `product-recovery` zawiera `446c522`, scalony audyt z PR #14 oraz scalony plan z PR #15.
- [x] G0.6 — nazwa i SHA bazowe zostały zapisane poniżej.
- [x] G0.7 — PR-01 może rozpocząć się wyłącznie z `product-recovery`.

**Kanoniczna gałąź Product Recovery:** `product-recovery`  
**Kanoniczny SHA bazowy G0:** `f914a2f9ce65d97f0bcfb2e50ba2522c3398a225`  
**Dowód decyzji:** PR #14, PR #15, commit `e371c76`, Draft PR #9 oraz otwarte issue #12.

### Kryterium zakończenia G0

Istnieje jedna jawnie wskazana baza, z której można utworzyć mały PR-01 bez 122 niezwiązanych commitów, bez utraty bezpiecznej architektury i bez dwuznaczności, która gałąź reprezentuje najnowszy produkt.

---

## 6. Roadmapa Product Recovery

### M1 — Rdzeń pracy trenera — P0

#### NOW — PR-01 — Trainer Session Brief

**Cel:** przed sesją pokazać trenerowi tylko informacje mogące zmienić jego decyzję.

- [x] Zakres i hierarchia informacji zatwierdzone.
- [x] Read-only brief zaimplementowany z istniejących danych Supabase.
- [x] Każdy fakt ma źródło i datę.
- [x] Brak automatycznej rekomendacji, nowego zapisu i migracji.
- [x] Empty states są czytelne i nie sugerują nieistniejących danych.
- [ ] Widok działa bez poziomego przewijania przy szerokości 360 px — oczekuje na test Damiana.
- [x] Testy repozytorium i GitHub Actions #91 przechodzą.
- [ ] Damian wykonuje test zadaniowy przed rzeczywistą lub symulowaną sesją.
- [ ] PR #17 scalony do kanonicznej bazy.

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
| AUD-01 | DONE | Audyt odzyskania produktu wykonany i scalony | PR #14, merge `6a105b48d00fbf848d8181b5e7bc0e83e31b3085` |
| GOV-01 | DONE | Kanoniczna linia `product-recovery` ustanowiona bez naruszenia `main` i bramki RODO | `product-recovery@f914a2f9ce65d97f0bcfb2e50ba2522c3398a225`; `main@e371c76`; Draft PR #9; issue #12 |
| PR-01 | IN REVIEW | Read-only Trainer Session Brief zaimplementowany; oczekuje na test 360 px i test zadaniowy Damiana | Draft PR #17; `0392e785a1d33405134f3cd30f24250ef52981ac`; GitHub Actions #91 PASS |
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

Implementacja **PR-01 — read-only Trainer Session Brief** znajduje się w Draft PR #17. Nie rozpoczynać PR-02.

Następną czynnością jest test akceptacyjny Damiana na telefonie lub w widoku 360 px, bez użycia realnych danych klienta. Kryterium: w mniej niż 60 sekund wskazać, co wymaga uwagi, co wydarzyło się ostatnio i jaka decyzja nadal należy do trenera; równocześnie potwierdzić brak poziomego przewijania.

Po zapisaniu wyniku w PR #17 można poprawić brief albo — jeśli test przejdzie — oznaczyć PR jako gotowy, scalić go do `product-recovery` i zaktualizować ten plan. Do tego czasu PR-01 pozostaje `IN REVIEW`.
