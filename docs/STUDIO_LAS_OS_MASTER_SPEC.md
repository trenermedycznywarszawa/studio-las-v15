# STUDIO LAS OS — MASTER PRODUCT & IMPLEMENTATION SPEC

**Status:** dokument nadrzędny produktu i implementacji\
**Przeznaczenie:** Codex / deweloper / review produktu / architektura\
**Wersja:** 1.1\
**Data:** 2026-09-07\
**Priorytet:** główny dokument produktu i kierunku implementacji, podporządkowany granicom Konstytucji. Szczegółowe kontrakty bezpieczeństwa, provenance i publikacji pozostają authoritative w swoim zakresie; pominięcie ich warunku tutaj nie uchyla tego warunku.

## Hierarchia źródeł prawdy i zakres

1. [Konstytucja](constitution/README.md) chroni tożsamość, misję i nienegocjowalne granice; Master Spec jej nie zastępuje.
2. Jawne decyzje właściciela i zaakceptowane ADR rozstrzygają wyłącznie wskazany zakres. Sama późniejsza data pliku nie nadaje mu pierwszeństwa ani nie uchyla granic bezpieczeństwa.
3. Ten Master Spec 1.1 jest głównym dokumentem produktu, priorytetów i kierunku implementacji.
4. Dokumenty Product i Architecture rozwijają ten kierunek. Kontrakty [09](architecture/09_SECURITY_RUNTIME_ARCHITECTURE.md), [10](architecture/10_INFORMATION_PROVENANCE_AND_APPROVAL_CONTRACT.md), [11](architecture/11_AI_RUNTIME_AND_PROVIDER_CONTRACT.md), [12](architecture/12_FILE_INGESTION_AND_SOURCE_INTEGRITY_CONTRACT.md), [13](architecture/13_DATA_LIFECYCLE_ACCESS_AUDIT_AND_DELETION_CONTRACT.md) oraz właściwe kontrakty workflow zachowują szczegółowe ograniczenia bezpieczeństwa, źródeł, zatwierdzania i publikacji. Konflikt P0/P1 wymaga rozstrzygnięcia właściciela, nie domyślnego uproszczenia kontraktu.
5. PRD określają zakres i kryteria akceptacji podporządkowane powyższym źródłom. Kod, migracje, testy i dowody wdrożenia opisują stan implementacji, a nie uprawnienie do zmiany produktu. Historia nie wyznacza bieżącej roadmapy.

[Rejestr źródeł](governance/00_SOURCE_OF_TRUTH_REGISTRY.md) wskazuje właścicieli szczegółowych pojęć; [raport reconciliation](reviews/2026-09-07_MASTER_SPEC_1_1_RECONCILIATION.md) klasyfikuje dokumenty i oddziela stan repo od roadmapy. Instrukcje pracy i rollout w tym dokumencie nie stanowią samodzielnej zgody na migrację, deployment ani zmianę danych.

## Owner Decision 2026-09-07 — Guidance channel vs product philosophy

**Product philosophy / attention architecture:** Paper guides the morning. Trainer gives meaning. App records the signal. Report shows the pattern. To wiążąca filozofia produktu i uwagi, nie luźna heurystyka ani wymóg jednego medium.

**Delivery channel contract:** `paper`, `app`, `deliberate_hybrid`. Trener świadomie wybiera kanał dostarczenia dla konkretnego release Guidance. `app` oznacza wyłącznie świadomie opublikowaną Guidance trenera; nie oznacza autonomicznego coachingu, planowania poranka, automatycznej progresji ani zastąpienia trenera. `deliberate_hybrid` jest terminem produktowym; odpowiada istniejącej wartości runtime/schema `hybrid`, bez zmiany enumu. Warunki publikacji, dostarczenia i wycofania poprzedniego papierowego release pozostają obowiązujące.

---

# 0. ZASADA NADRZĘDNA

Studio Las OS nie jest aplikacją fitness.

Studio Las OS jest wewnętrznym systemem wspierającym prywatny proces prowadzenia człowieka do odzyskania sprawności, zaufania do ciała i długoterminowej samodzielności.

Nienegocjowalne:

**Paper guides the morning.**\
**Trainer gives meaning.**\
**App records the signal.**\
**Report shows the pattern.**

Trener jest produktem.\
Aplikacja jest narzędziem.\
Papier prowadzi poranek.\
Raport pokazuje wzorzec.

Jeżeli nowa funkcja narusza którąkolwiek z tych zasad, nie implementować jej bez jawnej decyzji właściciela produktu.

---

# 1. TRYB PRACY DLA CODEX / DEWELOPERA

Pracuj jak principal product engineer + senior UX architect + backend architect + security-minded engineer.

Nie wdrażaj mechanicznie listy funkcji.

Najpierw:

1. odczytaj aktualny `product-recovery`,
2. sprawdź istniejące kontrakty i migracje,
3. zidentyfikuj istniejące source of truth,
4. określ najmniejszą zmianę rozwiązującą problem,
5. zabezpiecz działające flow i dane,
6. dodaj testy kontraktowe / regresyjne,
7. pracuj przez osobny branch i Draft PR,
8. nie rozszerzaj zakresu bez potrzeby.

Eskaluj wyłącznie, gdy zmiana:

- zmienia model biznesowy,
- zmienia znaczenie danych klienta,
- wpływa na bezpieczeństwo lub uprawnienia,
- usuwa dane,
- jest nieodwracalna,
- tworzy nowy trwały byt domenowy,
- albo zwiększa złożoność systemu na lata.

Nie optymalizuj pod liczbę funkcji.

Optymalizuj pod:

- jakość decyzji trenera,
- prostotę procesu klienta,
- integralność znaczenia danych,
- audytowalność,
- prywatność,
- niski screen time,
- odporność na błędy,
- możliwość rozwoju przez lata.

---

# 2. NORTH STAR PRODUKTU

Hierarchia domeny:

**CZŁOWIEK → ZDOLNOŚĆ → CEL ŻYCIOWY → PROCES → TRENING → REAKCJA → DECYZJA → ZMIANA**

Nigdy:

**ĆWICZENIE → PLAN → STATYSTYKI → KLIENT**

## Dla klienta

System ma pomagać odpowiedzieć:

1. Co zostało ustalone?
2. Dlaczego to robimy?
3. Co powinienem przekazać trenerowi?
4. Czy odzyskuję zdolność ważną dla mojego życia?

Nie ma prowadzić klienta ekranem przez cały dzień.

## Dla trenera

System ma pomagać odpowiedzieć:

1. Kim jest człowiek i po co jest w procesie?
2. Gdzie jesteśmy teraz?
3. Co się zmieniło?
4. Czy coś wymaga mojej decyzji?
5. Jaka wskazówka obowiązuje?
6. Co dzieje się dalej?
7. Czy istnieje wiarygodny dowód zmiany?

---

# 3. GRANICE PRODUKTU

Studio Las OS nie może stać się:

- fitness app,
- habit trackerem,
- wellness app,
- biohacking dashboardem,
- CRM-em,
- task managerem,
- SaaS-em dla trenerów,
- systemem gamifikacji,
- AI coachem zastępującym trenera,
- systemem zwiększającym screen time,
- automatem klinicznym,
- platformą powiadomień i alertów bez decyzji.

Nie budować:

- streaków,
- punktów,
- rankingów,
- badge’y,
- feedu,
- social layer,
- marketplace,
- rozbudowanego notification center,
- automatycznej progresji,
- automatycznej diagnozy,
- automatycznych wiadomości udających trenera,
- setek metryk bez związku z decyzją.

---

# 4. FILOZOFIA INFORMACJI

## 4.1 FACT → INTERPRETATION → DECISION → ACTION → OUTCOME

To nadrzędna semantyka, a nie nowy enum ani zamiennik dziewięciu `info_type`, niezależnych lifecycle zatwierdzania/publikacji i reguł widoczności z Architecture 10. Własny źródłowy sygnał klienta może być widoczny w autoryzowanej projekcji bez publikacji materiału trenera; udostępnienie klientowi interpretacji lub materiału trenera wymaga właściwego zatwierdzenia i jawnej publikacji.

Te warstwy muszą pozostać rozdzielone semantycznie.

**FACT**\
Pomiar, odpowiedź klienta, obserwacja, data, wydarzenie.

**INTERPRETATION**\
Znaczenie nadane przez trenera.

**DECISION**\
Jawna decyzja trenera.

**ACTION**\
To, co wynika z decyzji.

**OUTCOME**\
Późniejsza reakcja / efekt / zmiana.

System może porządkować FACT.

System może wskazać FACT wymagający przeglądu.

System nie może udawać INTERPRETATION ani DECISION.

---

# 5. CO JUŻ JEST KANONICZNE I NALEŻY CHRONIĆ

Zachowujemy poniższy zakres istniejącej implementacji na `origin/product-recovery` po PR #58 (`9f7d42654421f2c2ca998fa071206734b5881a3c`). Właściciel potwierdził stan produkcyjny; ten pass dokumentacyjny weryfikuje repo i historię PR, nie wykonuje nowego audytu live produkcji:

- bezpieczne logowanie Supabase Auth,
- MFA / AAL2 trenera,
- RLS / owner scope,
- Pierwszy kontakt,
- jawny Stage 2 inquiry → rozmowa → decyzja → explicit PWD conversion,
- PWD jako oddzielny workflow,
- PWD bez automatycznej publikacji Guidance,
- Guidance Release jako oddzielny, świadomy workflow trenera,
- panel trenera,
- panel klienta,
- sekcję „Teraz”,
- aktualny fokus,
- ostatnią obowiązującą decyzję,
- sygnały do przeglądu,
- trwały review konkretnej instancji sygnału,
- jawne decyzje końca cyklu,
- raporty,
- historię sesji,
- PWD history,
- pomiary,
- Polar / RPE / HR,
- obserwacje ruchowe,
- aktywne prowadzenie i wersje Guidance,
- klientowy check-in jako krótki zapis sygnału,
- produkcyjny deploy Netlify z allowlisted bundle.

Nie rebuildować tego od zera.

Granice stanu obecnego: cel klienta już istnieje (`clients.goal`), podobnie PWD, Guidance Release, „Teraz”, trwały review i decyzja cyklu. Review identyfikuje sygnał istniejącym kluczem typu/źródła/daty; nie oznacza nowego UUID każdego pomiaru. „Teraz” pokazuje istniejący otwarty sygnał, bez nowego silnika scoringu. Pełne phase-adaptive porządkowanie (§9), Change Evidence (§15), rozszerzona narracja raportu (§16) i Unified Process View (§17) są kierunkiem rozwoju, nie deklaracją ukończenia. Obecny minimalny runtime nie jest dowodem realizacji wszystkich przyszłych kontraktów Stage 3–5 ani ich testów użyteczności.

---

# 6. RECONCILIATION MASTER SPEC 1.0 → 1.1

## KEEP

Zachowujemy bez zmiany kierunku:

- człowiek ponad ćwiczeniem,
- zdolność i cel życiowy jako North Star,
- human-in-the-loop,
- minimum surface / maximum context,
- fact / interpretation / decision separation,
- phase-adaptive hierarchy,
- raport jako dowód zmiany,
- checkpoint 4 tygodni,
- raport 12 tygodni,
- siedem ruchów jako biblioteka odniesienia,
- Polar tylko w kontekście zadania,
- Tanita jako narzędzie opcjonalne,
- spokojny premium UX,
- security-by-design,
- explainability,
- brak automatycznych decyzji klinicznych.

## MODIFY

### Today Engine

Zmieniamy nazwę i rolę.

Nie budujemy app-led „Today Engine”, który prowadzi poranek.

Docelowo:

**PAPER → ACTION**\
**APP → SIGNAL / CONTEXT / CONFIRMATION**

Ten skrót opisuje architekturę uwagi. Nie wyklucza dostarczenia świadomie opublikowanej Guidance trenera przez `app` zgodnie z kontraktem kanału danego release.

Aplikacja klienta może:

- pokazać obowiązującą wskazówkę,
- przypomnieć jej sens,
- pozwolić zapisać krótki sygnał,
- pokazać prosty dowód zmiany,
- udostępnić zatwierdzony raport.

App może dostarczyć prowadzącą instrukcję trenera, gdy trener świadomie wybrał `app` lub `deliberate_hybrid` dla tego release. Nie może samodzielnie planować poranka ani zastąpić trenera; obowiązuje Owner Decision powyżej.

### Decision Engine

Nie budujemy pełnego Decision Engine z:

- severity,
- confidence,
- suggested actions array,
- snooze,
- owner assignment,
- SLA,
- kolejką tasków.

Kanon:

**SIGNAL → TRAINER REVIEW → TRAINER DECISION**

Obecny minimalny model review sygnału pozostaje preferowany.

Nowy byt `DecisionItem` może powstać dopiero wtedy, gdy realna praktyka pokaże, że obecny model signal review jest niewystarczający.

### Guidance Engine

Nie budujemy rozbudowanego nowego silnika.

Rozwijamy istniejący Guidance Release.

Warianty Minimum / Standard / Rozszerzony mogą zostać dodane tylko wtedy, gdy:

- wspierają realne prowadzenie w świadomie wybranym przez trenera kanale danego release, zgodnie z filozofią uwagi,
- nie zwiększają screen time,
- nie tworzą fitness plan buildera.

### Progress Engine

Nie tworzymy osobnego dashboardu postępu.

Postęp jest modelem interpretacji danych do raportu i decyzji.

Warstwy sukcesu:

1. reakcja / tolerancja,
2. zdolność,
3. ważne zadanie,
4. życie / samodzielność.

Najwyższa warstwa:

**co człowiek znowu może zrobić?**

### Story Engine

Kierunek zachowujemy, ale nie jako autonomiczny „engine”.

Najpierw budujemy prosty, zatwierdzany przez trenera model **Change Evidence**.

Automatyczne generowanie kandydatów jest późniejszym etapem.

### Timeline Engine

Zmieniamy na **Unified Process View**.

Nie implementujemy event sourcingu.

Nie tworzymy tabeli zdarzeń tylko dlatego, że „timeline brzmi dobrze”.

Najpierw należy sprawdzić, czy chronologiczny widok można zbudować z istniejących tabel i source timestamps.

Nowy trwały TimelineEvent dopiero, jeśli istniejący model nie zapewnia integralnej chronologii.

## DEFER

Odłożyć do czasu zebrania realnych danych z użytkowania:

- automatyczny trend detection,
- confidence system,
- auto-generated change evidence,
- checkpoint 8 tygodni jako oddzielny produkt,
- zaawansowany adaptive check-in,
- contextual Learn,
- PDF auto-generation,
- pełne porównania 7 ruchów w czasie,
- integracja Tanita jako system,
- offline synchronization,
- zaawansowana telemetria produktu.

## REJECT

Odrzucamy:

- rozbudowaną kolejkę Decision Items jako P0,
- task-manager semantics,
- app-led morning,
- gamifikację,
- automatyczne planowanie,
- automatyczne messaging flows do klienta,
- dashboard biomarkerów,
- event sourcing,
- CRM semantics,
- automatyczną kliniczną interpretację,
- system priorytetów bez dowodu operacyjnego,
- AI coach.

---

# 7. ARCHITEKTURA PRODUKTU 1.1

Zamiast 6 niezależnych „engine’ów” definiujemy 4 warstwy.

## LAYER 1 — RELATIONSHIP & ENTRY

Obejmuje:

- Pierwszy kontakt,
- rozmowę,
- decyzję,
- explicit PWD conversion,
- PWD.

Cel:

zrozumieć człowieka przed wejściem w proces.

Nie CRM.

Nie lead scoring.

## LAYER 2 — TRAINER DECISION SUPPORT

Obejmuje:

- „Teraz”,
- aktualny fokus,
- safety/context,
- sygnały do przeglądu,
- review sygnału,
- ostatnią decyzję,
- cycle decision,
- przygotowanie do sesji.

Cel:

trener podejmuje właściwą decyzję bez przekopywania danych.

## LAYER 3 — GUIDANCE & RESPONSE

Obejmuje:

- opublikowaną Guidance,
- świadomie wybrany kanał `paper` / `app` / `deliberate_hybrid` (runtime: `hybrid`),
- klientowy krótki sygnał,
- sesje,
- reakcję,
- pomiary tylko wtedy, gdy wspierają decyzję.

Cel:

prowadzić proces przy minimalnym ekranie.

## LAYER 4 — EVIDENCE & REPORT

Obejmuje:

- historię procesu,
- potwierdzone dowody zmiany,
- checkpoint,
- raport 12 tygodni,
- decyzję co dalej.

Cel:

pokazać wiarygodny wzorzec zmiany.

---

# 8. PANEL TRENERA — KANONICZNA HIERARCHIA

## Góra klienta

Docelowo:

1. Imię i etap/faza.
2. Cel życiowy w języku klienta.
3. Aktualna zdolność.
4. Największa aktualna bariera.
5. „Teraz”.

Nie należy wprowadzać tych elementów mechanicznie, jeśli brak poprawnych source fields.

Nie duplikować danych tylko dla layoutu.

## TERAZ

Najważniejszy blok.

Pokazuje:

- etap procesu,
- aktualny fokus,
- ostatnią obowiązującą decyzję,
- maksymalnie jeden najważniejszy otwarty sygnał,
- następny krok / przegląd,
- informację, czy wymagana jest decyzja końca cyklu.

„Teraz” nie interpretuje klinicznie.

## Pozostałe sekcje

Kolejność ma być phase-aware.

Po wejściu klienta w proces:

- PWD pozostaje dostępne,
- ale nie powinno dominować ekranu.

Historia sesji domyślnie zwinięta.

Stare Guidance domyślnie historyczne.

Raport i decyzja dominują pod koniec procesu.

---

# 9. PHASE-ADAPTIVE UI

**FUTURE ROADMAP:** poniższy układ jest projektem adaptacji informacji, nie istniejącym algorytmem progresji ani sztywnym programem klinicznym tygodni. Etap i decyzję określa trener; checkpoint nie uruchamia automatycznej zmiany Guidance.

Nie tworzymy osobnych aplikacji.

Zmienia się kolejność i nacisk.

## Faza 0 — kwalifikacja / PWD

Dominują:

- cel,
- kontekst,
- granice bezpieczeństwa,
- selektywne obserwacje,
- interpretacja,
- decyzja o prowadzeniu.

## Tydzień 1–4 — tolerancja

Dominują:

- reakcja na bodziec,
- regularność,
- ograniczenia,
- pierwsze bariery,
- reakcja klienta.

## Tydzień 5–8 — adaptacja

Dominują:

- zdolność,
- tolerancja większego zadania,
- samoregulacja,
- jakość wykonania,
- sensowny trend.

## Tydzień 9–12 — transfer

Dominują:

- odzyskane zdolności,
- ważne zadania życiowe,
- samodzielność,
- dowody zmiany,
- raport,
- decyzja co dalej.

---

# 10. PWD — KANON

Sekwencja:

**cel klienta → znaczenie → kontekst i granice → 0–3 adekwatne obserwacje → interpretacja trenera → decyzja → następny krok**

Siedem ruchów:

- biblioteka odniesienia,
- nie bateria obowiązkowych testów.

PWD:

- nie tworzy automatycznie Guidance,
- nie publikuje planu,
- nie nadpisuje starej PWD,
- każda kolejna iteracja pozostawia historię.

---

# 11. SYGNAŁY — KANON

Sygnał istnieje tylko wtedy, gdy:

1. ma konkretne źródło,
2. ma datę źródła,
3. może zmienić decyzję,
4. trener może go przejrzeć.

Cykl:

**OPEN → REVIEWED**

To opis semantyczny, nie zmiana enumów. Zachowujemy istniejące outcomes review i odrębne lifecycle Guidance, cyklu, zatwierdzania oraz publikacji.

Wynik review może być mały i ludzki.

Nie dodawać:

- priority score,
- SLA,
- task owner,
- escalation engine,
- notification center.

Jeżeli praktyka pokaże, że potrzebny jest nowy model — decyzja architektoniczna osobno.

---

# 12. GUIDANCE — KANON

Trainer gives meaning.

Guidance Release pozostaje oddzielnym workflow.

Aktywna wskazówka musi mieć jednoznacznie:

- wersję,
- status,
- kanał,
- delivery state,
- treść/actions,
- historię.

W zakresie Guidance i innych materiałów trenera klient widzi wyłącznie to, co zostało świadomie opublikowane. Własne dane źródłowe i sygnały klienta podlegają odrębnej autoryzacji widoczności z Architecture 10; publikacja nie jest warunkiem odczytu każdego własnego sygnału.

Plan klienta nie jest surową kopią prywatnych notatek trenera.

Papier może pozostać głównym nośnikiem działania.

Aplikacja wspiera zapis i ciągłość.

---

# 13. CHECK-IN KLIENTA

Check-in nie jest codziennym trackerem.

Zasada:

**zbieraj tylko to, co może zmienić decyzję trenera.**

Obecny krótki sygnał jest właściwym baseline.

Rozszerzać tylko, jeśli istnieje konkretna hipoteza.

Preferowane pytania:

- gotowość / samopoczucie, jeśli istotne,
- dyskomfort / reakcja, jeśli istotne,
- krótka notatka.

Sen, stres i inne elementy tylko warunkowo.

Nie zbierać danych „na przyszłość”.

---

# 14. POMIARY

## Polar

Może być używany jako FACT.

Nigdy sam jako DECISION.

HR należy interpretować razem z:

- zadaniem,
- RPE,
- reakcją,
- kontekstem klienta.

## Tanita

Niski priorytet.

Nie integrować głębiej bez jasno opisanej decyzji, którą pomiar ma zmienić.

---

# 15. CHANGE EVIDENCE

**FUTURE ROADMAP / propozycja modelu:** poniższe pola i stany nie opisują istniejącej tabeli ani zatwierdzonej migracji. Najpierw ręczny workflow i wykazanie luki; projekt danych wymaga osobnego przeglądu kontraktów provenance i bezpieczeństwa.

To jest najważniejszy nowy kandydat domenowy po ustabilizowaniu obecnego systemu.

Minimalny koncept:

- `id`
- `client_id`
- `occurred_at`
- `type`
- `summary`
- `source_type`
- `source_id`
- `goal_reference?`
- `status`
- `confirmed_by?`
- `confirmed_at?`
- `include_in_report`

Status:

- `candidate`
- `confirmed`
- `dismissed`

Pierwsza wersja nie musi generować candidate automatycznie.

Trener może utworzyć lub zatwierdzić dowód.

Przykłady:

- pierwszy spokojny bieg 5 km,
- ważna odzyskana zdolność,
- lepsza tolerancja tego samego zadania,
- zwiększona samodzielna regulacja,
- ważna wypowiedź klienta.

---

# 16. RAPORT

**Report shows the pattern.**

Raport nie jest eksportem bazy.

Raport 12 tygodni:

1. Punkt startowy.
2. Cel klienta.
3. Najważniejsze ograniczenie.
4. Co robiliśmy.
5. Jak organizm / człowiek reagował.
6. Najważniejsze decyzje.
7. Co się zmieniło.
8. Co klient odzyskał.
9. Co nadal wymaga pracy.
10. Decyzja co dalej.

Najsilniejsza forma:

**WTEDY → TERAZ**

Raport nie generuje decyzji.

Decyzję zapisuje trener.

---

# 17. OŚ PROCESU

Cel:

umożliwić trenerowi zobaczenie chronologii bez przeszukiwania wielu sekcji.

Najpierw:

agreguj istniejące rekordy odczytowo.

Źródła:

- PWD,
- sesje,
- check-in,
- pomiary,
- Polar,
- obserwacje,
- signal reviews,
- Guidance releases,
- cycle decisions,
- raporty.

Nie dodawać trwałej tabeli timeline, jeśli nie jest konieczna.

---

# 18. SECURITY

Nienegocjowalne:

- Supabase Auth,
- MFA/AAL2 dla trenera,
- owner scope,
- RLS,
- least privilege,
- brak service-role w browser,
- brak bezpośredniego publicznego zapisu do chronionych tabel,
- audit metadata,
- prywatne rationale trenera bez client exposure,
- additive migrations,
- backup / recovery discipline,
- staging validation przed produkcją,
- zero prawdziwych danych w test fixtures.

Każda nowa tabela wrażliwa:

- ENABLE RLS,
- FORCE RLS,
- brak anon,
- minimalne grants,
- owner-scope,
- AAL2 dla zapisów trenera,
- test roli klienta,
- test cross-owner,
- test audytu.

---

# 19. UX / PREMIUM

Premium nie oznacza więcej ekranów.

Premium = mniej tarcia + więcej właściwego kontekstu.

Kierunek:

- jasny,
- spokojny,
- naturalny,
- dużo przestrzeni,
- mało statusów kolorystycznych,
- jeden główny CTA na sekcję,
- brak agresywnych alarmów,
- brak języka winy,
- brak technicznych enumów w UI.

Copy:

neutralne,
ludzkie,
bez języka automatyzacji klinicznej.

---

# 20. REALNY ROADMAP 1.1

## P0 — STABILITY & SEMANTIC INTEGRITY

Stan: w dużej części wdrożony.

Obejmuje:

- Auth + MFA + RLS,
- Stage 2,
- explicit PWD conversion,
- PWD workflow,
- Guidance separation,
- „Teraz”,
- signal review,
- cycle decision,
- historia PWD/sesji,
- poprawna semantyka raportu,
- produkcyjny deploy,
- canonical staging E2E.

Pozostałe bramki potwierdzenia P0 (nie lista funkcji do ponownego wdrożenia):

1. uzgodnić administracyjne zamknięcie i dowody rollout Issue #57 z już scalonym PR #58; otwarte issue samo nie oznacza braku implementacji,
2. porządkowanie lokalnego worktree / `.netlify` traktować jako osobne zadanie właściciela, bez modyfikowania brudnego checkoutu w tym pass,
3. zachować bramkę potwierdzenia produkcyjnego `client-access`; dokumentacja nie zastępuje dowodu z właściwego środowiska,
4. utrzymać pełny security regression gate; historyczny wynik staging nie jest nowym wynikiem produkcyjnym.

Nie dodawać nowego dużego modelu domenowego w P0.

## P1 — CLIENT GOAL + PHASE-AWARE INFORMATION ARCHITECTURE

Następny duży etap.

Cel:

trener w 5 sekund rozumie człowieka i etap.

Zakres:

1. audyt źródeł celu życiowego,
2. jedno kanoniczne przedstawienie celu klienta,
3. phase-aware ordering sekcji,
4. aktualna zdolność / bariera tylko jeśli dane mają poprawne źródło,
5. PWD przesunięte niżej po rozpoczęciu procesu,
6. unified read-only process timeline bez event sourcingu,
7. test „5 second trainer comprehension”.

Bez nowego Decision Engine.

## P2 — CHANGE EVIDENCE & REPORT STORY

Po zebraniu doświadczeń z P1.

Zakres:

1. minimalny Change Evidence model,
2. manual candidate / confirm / dismiss,
3. powiązanie z celem,
4. checkpoint 4 tygodni,
5. raport 12 tygodni „Wtedy → Teraz”,
6. możliwość prześledzenia dowodu do źródła.

## P3 — SELECTIVE INTELLIGENCE

Tylko jeśli realne użycie uzasadni.

Możliwe:

- trend detection,
- auto-candidate Change Evidence,
- adaptive check-in,
- contextual education,
- PDF generation,
- bardziej zaawansowane comparison views.

Każda funkcja musi przejść osobną decision gate.

---

# 21. DEFINITION OF DONE — P1

P1 jest zakończone, gdy:

1. nie utracono żadnych danych,
2. cel klienta ma jedno kanoniczne źródło,
3. faza procesu wpływa na hierarchię UI,
4. trener w 5 sekund widzi cel, fokus i decision need,
5. PWD nie dominuje podczas aktywnego procesu,
6. historia jest dostępna chronologicznie bez budowania event sourcingu,
7. Fact / Interpretation / Decision pozostają rozdzielone,
8. klientowy panel respektuje filozofię uwagi i dostarcza tylko świadomie opublikowaną Guidance trenera w wybranym kanale, bez autonomicznego prowadzenia,
9. mobile nie ma overflow,
10. RLS/AAL2 regresje przechodzą,
11. staging E2E przechodzi,
12. produkcyjny smoke przechodzi.

---

# 22. DEFINITION OF DONE — P2

P2 jest zakończone, gdy:

1. Change Evidence istnieje jako mały, audytowalny byt,
2. trener kontroluje confirmation,
3. każde evidence ma source,
4. evidence może być powiązane z celem,
5. raport używa potwierdzonych dowodów,
6. raport pokazuje „Wtedy → Teraz”,
7. decyzja co dalej pozostaje osobnym aktem trenera,
8. klient nie otrzymuje prywatnej interpretacji bez świadomej publikacji.

---

# 23. ZASADA KAŻDEJ NOWEJ FUNKCJI

Przed implementacją odpowiedz:

1. Jaką decyzję poprawia?
2. Jakie tarcie usuwa?
3. Czy klient lub trener faktycznie tego potrzebuje?
4. Czy można rozwiązać problem hierarchią informacji?
5. Czy wymaga nowego trwałego bytu?
6. Czy istniejące dane są wystarczające?
7. Czy zwiększa screen time?
8. Czy narusza filozofię uwagi lub świadomy wybór kanału Guidance przez trenera?
9. Czy osłabia rolę trenera?
10. Czy zwiększa dług systemu?

Jeżeli odpowiedzi są słabe:

**NIE BUDUJ.**

---

# 24. STANDARD ZADANIA DLA CODEX

Każde większe zadanie musi zawierać:

## Zakres

Co dokładnie ma zostać zmienione.

## Poza zakresem

Czego nie wolno zmieniać.

## Inwarianty

Jakie kontrakty produktu muszą pozostać prawdziwe.

## Bezpieczeństwo

RLS / Auth / AAL2 / privacy / audit.

## Kryteria sukcesu

Obserwowalne i testowalne.

## Testy

Static + SQL + browser + regression według wpływu.

## Rollout

branch → Draft PR → audit → staging → E2E → owner merge → production migration → smoke → deploy.

## Raport końcowy

- PR,
- HEAD,
- files changed,
- model danych,
- migracje,
- tests PASS/FAIL,
- P0/P1/P2,
- środowiska dotknięte,
- rollback,
- residual risk.

---

# 25. ZASADA KOŃCOWA

Studio Las OS ma sprawić, że:

### klient

nie czuje, że obsługuje aplikację.

Czuje, że jest prowadzony przez człowieka.

### trener

nie widzi większej liczby danych.

Szybciej rozumie, co ma znaczenie.

### po 12 tygodniach

nie powstaje eksport statystyk.

Powstaje wiarygodny dowód:

**co było ważne → co robiliśmy → jak człowiek reagował → co się zmieniło → co odzyskał → co dalej.**

To jest produkt.
