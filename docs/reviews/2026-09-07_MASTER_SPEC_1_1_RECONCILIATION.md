# Studio Las OS — Master Spec 1.1 Canonicalization & Architecture Reconciliation

**Date:** 2026-09-07\
**Status:** dokumentacyjny reconciliation; bez zgody na implementację lub rollout\
**Branch:** `docs/master-spec-1-1`\
**Base:** `origin/product-recovery`, `9f7d42654421f2c2ca998fa071206734b5881a3c` (merge PR #58)\
**Canonical product document:** [Master Spec 1.1](../STUDIO_LAS_OS_MASTER_SPEC.md)

## Wynik i źródło

Master Spec 1.1 jest głównym dokumentem produktu i kierunku implementacji pod granicami Konstytucji. Szczegółowe kontrakty bezpieczeństwa, provenance i publikacji zachowują autorytet w swoim zakresie. Nie znaleziono kolejnego nierozstrzygniętego konfliktu P0/P1. Jedyny konflikt P1 wymagający decyzji właściciela został rozstrzygnięty przed kontynuacją tego pass.

Źródłem jest dokładnie lokalny `C:/Users/Damian/Downloads/STUDIO_LAS_OS_MASTER_SPEC_v1.1.md`, SHA-256 `272b0aa4c16b0d45fef05708815aab931a56a0125c415c8ae49d6b39fd1f0645`. Oryginał pozostaje bez zmian. Wersja 1.0 nie została użyta jako substytut; benchmark FitPros nie ustanawia autorytetu produktu. Kanoniczna kopia zawiera celowe, wymienione poniżej korekty zamiast swobodnego przepisania specyfikacji.

Praca kontynuuje wcześniejszy przegląd. Osobny czysty worktree utworzono z aktualnego `origin/product-recovery`; istniejący brudny checkout `codex/issue-46-phase-b` pozostawiono bez zmian. Macierz obejmuje wszystkie śledzone pliki Markdown w bazie, a także dwa nowe dokumenty tego pass. Klasyfikacja oznacza rolę i zakres dokumentu, nie deklarację implementacji wszystkich jego wymagań.

## Owner Decision 2026-09-07 — Guidance channel vs product philosophy

Właściciel rozdzielił wiążącą filozofię produktu / architekturę uwagi od kontraktu dostarczenia. „Paper guides the morning. Trainer gives meaning. App records the signal. Report shows the pattern.” nie jest luźną heurystyką. Trener świadomie wybiera `paper`, `app` lub `deliberate_hybrid` dla konkretnego release. `app` dostarcza świadomie opublikowaną Guidance trenera i nie prowadzi autonomicznego coachingu, planowania poranka ani progresji, ani nie zastępuje trenera. Produktowe `deliberate_hybrid` odpowiada istniejącemu runtime enum `hybrid`.

Pełny zapis decyzji znajduje się w [Master Spec](../STUDIO_LAS_OS_MASTER_SPEC.md#owner-decision-2026-09-07--guidance-channel-vs-product-philosophy). Kontrakty publikacji, dostarczenia i wycofania poprzedniego papierowego release pozostają obowiązujące. Nie powstała nowa decyzja pozwalająca osłabić pozostałe kontrakty.

## Hierarchia i dowody

Konstytucja chroni granice; jawne decyzje właściciela i zaakceptowane ADR rozstrzygają tylko własny zakres; Master określa produkt i kierunek implementacji; Product/Architecture rozwijają go z zachowaniem autorytetu szczegółowych kontraktów bezpieczeństwa, provenance i publikacji; PRD doprecyzowują zakres i akceptację. Implementacja i runtime są dowodem stanu, nie źródłem uprawnienia do zmiany produktu. Daty plików nie zastępują jawnego rozstrzygnięcia. Rejestr wskazuje właściciela danego pojęcia, a historia nie wyznacza aktualnej roadmapy.

Kluczowe źródła przeglądu: README; Constitution 00–04; rejestr źródeł i decyzje właściciela; Product 00–10, execution plan i manifest Stage 3; Architecture 00–22, ze szczególnym uwzględnieniem 09–13 i 17–22; PRD 001–005; DATA_POLICY; historyczne dokumenty Paper First, domeny i sync; dowody deployment/reviews. Stan implementacji porównano z `assets/os/` (runtime, data, PWD, Guidance, decision-state/support, trainer/client UI), migracjami i lokalnymi testami kontraktów oraz historią PR. Nie wykonywano nowego audytu live danych ani pomiarów użyteczności.

| Obszar | Dowód w repo / historii | Wniosek i granica |
|---|---|---|
| Auth, owner RLS, MFA/AAL2, client projection | Architecture 09, DATA_POLICY, runtime/data/client UI, migracje i testy MFA/access | Chronić istniejące granice; test statyczny nie dowodzi aktualnej konfiguracji produkcji. |
| PWD | [PR #35](https://github.com/trenermedycznywarszawa/studio-las-v15/pull/35), atomowy `save_pwd_workflow`, istniejące cztery enumy PWD | Cel już jest w `clients.goal`; do 3 obserwacji, oddzielna decyzja, brak automatycznej Guidance. Nie mapować enumów prototypu wprost na runtime. |
| Guidance Release | istniejący workflow i migracje 022/023 | Publikacja, wersjonowanie, delivery i paper retirement istnieją. Produktowy `deliberate_hybrid` nie zmienia runtime `hybrid`. Nie twierdzimy, że pełny przyszły kontrakt Stage 5 jest już wykonany. |
| Stage 2 | [PR #48](https://github.com/trenermedycznywarszawa/studio-las-v15/pull/48), ADR 20 | `inquiries` + `inquiry_decisions`; decyzje PWD/FOLLOW_UP/NOT_NOW/REFERRED/NOT_A_FIT/CLOSED_BY_PERSON. Jawna konwersja tylko danych identity/contact; decyzja PWD sama nie tworzy klienta, konta ani Guidance. |
| Public ingress | [PR #51](https://github.com/trenermedycznywarszawa/studio-las-v15/pull/51), Architecture 21 | Ograniczony endpoint i service-only RPC, allowlist, idempotencja i limity; brak publicznych odczytów i anon DML. |
| Powiadomienie trenera | [PR #53](https://github.com/trenermedycznywarszawa/studio-las-v15/pull/53), Architecture 22 | Jawny wyjątek od wcześniejszego zakazu: stała treść bez PII dla nowego inquiry, bez wiadomości do klienta i bez outbox/retry. |
| Netlify | [PR #56](https://github.com/trenermedycznywarszawa/studio-las-v15/pull/56), konfiguracja i skrypt build | Allowlisted OS bundle; dokumentacja nie jest publikowanym bundle. Stary Pages URL nie jest aktualną instrukcją wyboru targetu. Nie uruchamiano build ani deploy. |
| Decision & State Integrity | [PR #58](https://github.com/trenermedycznywarszawa/studio-las-v15/pull/58), decision-state/support, migracja `20260904150825` | Trwały review klucza sygnału typu/źródła/daty, decyzja bieżącego cyklu, historia i „Teraz” już istnieją. Brak nowego priority scoring i UUID każdego pomiaru. |
| Staging / rollout | [PR #37](https://github.com/trenermedycznywarszawa/studio-las-v15/pull/37), późniejsze dowody PR #48/#51/#53, deployment 07 | Dowody historyczne, nie nowe testy tej gałęzi. Produkcja wskazana przez właściciela; merge nie zastępuje dowodu live. [Issue #57](https://github.com/trenermedycznywarszawa/studio-las-v15/issues/57) nadal OPEN podczas kontroli. |

## Rozbieżności i rozstrzygnięcia

| Klasa | Rozbieżność | Rozstrzygnięcie |
|---|---|---|
| P1 — resolved by owner | Master zabraniał zastąpienia papierowej instrukcji, a zaakceptowany kanał dopuszczał app/hybrid. | Owner Decision powyżej; minimalne korekty §6, §7, §21, §23 i objaśnienie skrótu PAPER/APP. |
| P2 — resolved | Master mógł być czytany jako dokument ponad Konstytucją i szczegółowymi kontraktami. | Jawna hierarchia; zakres decyzji/ADR; zachowane security/provenance/publication. |
| P2 — resolved | FACT → INTERPRETATION → DECISION lub OPEN → REVIEWED mogły wyglądać jak zamienniki typów i stanów. | To semantyka; zachowane dziewięć typów Architecture 10, niezależne lifecycle i istniejące enumy runtime. |
| P2 — resolved | „Klient widzi wyłącznie opublikowane” obejmowało także własne sygnały źródłowe. | Ograniczone do Guidance i materiałów trenera; autoryzowana widoczność własnych źródeł pozostaje odrębna. |
| P2 — resolved | Słowo „heuristic” osłabiało wiążącą filozofię uwagi. | Poprawione aktywne wejścia Constitution/registry i objaśnienie w Product index; historycznych dokumentów nie przepisano. |
| P2 — resolved | Roadmapa wyglądała jak stan produkcji lub nakaz rebuild #57. | Baseline po #58, osobne dowody rollout, przyszłe §9/15–17; istniejący cel, Guidance, review i cykl zachowane. |
| P2 — resolved | Execution plan / prototype candidates zawierały stare etykiety NOT AUTHORIZED i enumy. | Statusy ograniczone do daty i zakresu; ADR20/PR48 oraz kontrakty21–22 są jawnie wskazanymi następcami. Przyszłych kontraktów nie uchylono. |
| P2 — resolved | Architecture21 wykluczał notification, które później jawnie dopuszczono. | Wskazany wąski wyjątek Architecture22/PR53; bez rozszerzania automatyzacji. |
| P2 — resolved | Stary sync design opisywał localStorage/offline queue; starsze dowody opisywały dawny stan MFA/hosting. | Sync SUPERSEDED; datowane obserwacje historyczne; aktywne security gates pozostają. To dokumentacyjny dług, nie nowo wykryty błąd runtime. |
| P2 — residual evidence | Issue57 OPEN; brak nowego audytu produkcji i pełnej walidacji usability. | Nie zamykano issue i nie deklarowano nowych wyników. Osobne potwierdzenie właściciela/rollout; nie blokuje dokumentacyjnego Draft PR. |

**P0:** brak nowego konfliktu. **P1:** konflikt kanału rozstrzygnięty przez właściciela, brak nierozstrzygniętego P1. **P2:** powyższe poprawki dokumentacyjne oraz jawne ograniczenia dowodów. Brak pozycji wymagającej statusu CONFLICT po zatwierdzonym rozstrzygnięciu; historia konfliktu pozostaje w raporcie.

## Dokładny zakres korekt Master Spec

1. Metadata i nowy blok hierarchii: Konstytucja, scoped owner decisions/ADR, Master, detailed contracts, PRD i stan implementacji; brak automatycznej autoryzacji rollout.
2. Nowy zapis Owner Decision, rozdzielenie filozofii i kanału per release, jawne `deliberate_hybrid` → runtime `hybrid`.
3. §4: semantyka nie zastępuje typów i lifecycle Architecture10; rozróżnienie źródeł klienta od publikowanych materiałów trenera.
4. §5: baseline po #58, owner-attested produkcja, ograniczenia review/„Teraz”, reuse istniejącego celu i workflow, przyszłe funkcje oddzielone od stanu repo.
5. §6: objaśnienie PAPER/APP, korekta zakazu app i papierowego warunku Guidance Engine; bez dodawania autonomicznego prowadzenia.
6. §7: komplet dopuszczonych kanałów. §9: FUTURE ROADMAP i brak automatycznego tygodniowego programu/progresji.
7. §11: OPEN → REVIEWED to semantyka, nie nowy enum. §12: publikacja materiałów trenera vs autoryzowany odczyt własnych sygnałów.
8. §15: Change Evidence to przyszła propozycja, nie istniejąca tabela ani zgoda na migrację.
9. §20: #57 to uzgodnienie zamknięcia/dowodów po #58; cleanup i produkcyjne gates są odrębnymi zadaniami, nie działaniami tego pass.
10. §21 i §23: kryteria zgodne z wiążącą filozofią i świadomie wybranym kanałem.

Pozostała treść źródła 1.1 została zachowana. Technicznie ujednolicono końce linii, a 16 Markdown hard breaks zapisano backslashem zamiast dwóch końcowych spacji, zachowując renderowanie i czysty whitespace check. Nie zastępowano PRD005 ani Architecture18 uproszczoną deklaracją pełnej implementacji. Istniejące typy informacji, lifecycle, PWD/cycle/review/channel enums i schemat pozostały bez zmian.

## Document classification

**KEEP:** aktywny właściciel granic, szczegółowej polityki lub dowodu źródłowego w swoim zakresie. **SUBORDINATE:** rozwija Master albo dokumentuje implementację; szczegółowe security/provenance/publication pozostają authoritative. **SUPERSEDED:** wcześniejszy kierunek zastąpiony wskazanym następcą; zachowany historycznie. **HISTORICAL:** datowany prototyp, audyt lub dowód; nie instrukcja aktualnego rollout. **CONFLICT:** nierozstrzygnięta sprzeczność wymagająca decyzji; obecnie brak.

Status jest zakresowy: HISTORY nie unieważnia zasad bezpieczeństwa w dokumencie; SUBORDINATE nie pozwala pominąć specjalistycznego kontraktu. Prototyp nie jest dowodem produkcyjnego schematu.

| Dokument | Klasyfikacja | Uzasadnienie / zakres |
|---|---|---|
| [DEV_TESTING_URLS.md](../../DEV_TESTING_URLS.md) | SUPERSEDED | Produkcyjny OS Pages target zastąpiony przez #56; nie używać do wyboru środowiska. |
| [README.md](../../README.md) | SUBORDINATE | Wejście do repo; hierarchia Master i aktualny kierunek delivery Netlify. |
| [docs/DATA_POLICY.md](../DATA_POLICY.md) | KEEP | Polityka danych i prywatności; datowane opisy gotowości nie są live audytem. |
| [docs/IMPLEMENTATION_PLAN_PAPER_FIRST.md](../IMPLEMENTATION_PLAN_PAPER_FIRST.md) | HISTORICAL | Już oznaczone jako historia Paper First; status zachowany, bez ponownego przepisywania. |
| [docs/PAPER_FIRST_EXECUTION_CHECKLIST.md](../PAPER_FIRST_EXECUTION_CHECKLIST.md) | HISTORICAL | Już oznaczone jako historia Paper First; status zachowany, bez ponownego przepisywania. |
| [docs/PAPER_FIRST_MIGRATION_PROPOSAL.md](../PAPER_FIRST_MIGRATION_PROPOSAL.md) | HISTORICAL | Już oznaczone jako historia Paper First; status zachowany, bez ponownego przepisywania. |
| [docs/PAPER_FIRST_PROTOCOLS.md](../PAPER_FIRST_PROTOCOLS.md) | HISTORICAL | Już oznaczone jako historia Paper First; status zachowany, bez ponownego przepisywania. |
| [docs/PAPER_FIRST_TEST_DB_REVIEW.md](../PAPER_FIRST_TEST_DB_REVIEW.md) | HISTORICAL | Już oznaczone jako historia Paper First; status zachowany, bez ponownego przepisywania. |
| [docs/PAPER_FIRST_TEST_DB_RUNBOOK.md](../PAPER_FIRST_TEST_DB_RUNBOOK.md) | HISTORICAL | Już oznaczone jako historia Paper First; status zachowany, bez ponownego przepisywania. |
| [docs/SCHEMA_GAP_ANALYSIS_PAPER_FIRST.md](../SCHEMA_GAP_ANALYSIS_PAPER_FIRST.md) | HISTORICAL | Już oznaczone jako historia Paper First; status zachowany, bez ponownego przepisywania. |
| [docs/STUDIO_LAS_OS_BLUEPRINT.md](../STUDIO_LAS_OS_BLUEPRINT.md) | SUPERSEDED | Istniejący compatibility pointer; aktualny kierunek w Master i aktywnych kontraktach. |
| [docs/STUDIO_LAS_OS_DOMAIN_MODEL.md](../STUDIO_LAS_OS_DOMAIN_MODEL.md) | SUBORDINATE | Reuse domeny; propozycje obiektów/views nie są aktualnym inventory schematu. |
| [docs/STUDIO_LAS_OS_MASTER_SPEC.md](../STUDIO_LAS_OS_MASTER_SPEC.md) | KEEP | Główny dokument produktu i implementacji pod Konstytucją. |
| [docs/architecture/00_ARCHITECTURE_PRINCIPLES.md](../architecture/00_ARCHITECTURE_PRINCIPLES.md) | SUBORDINATE | Zasady architektury pod Master i konstytucyjnymi granicami. |
| [docs/architecture/01_METHOD_TO_OS_MAPPING.md](../architecture/01_METHOD_TO_OS_MAPPING.md) | SUBORDINATE | Mapowanie metody na OS; nie automatyczny proces coachingu. |
| [docs/architecture/02_DATA_MODEL_DECISIONS.md](../architecture/02_DATA_MODEL_DECISIONS.md) | SUBORDINATE | Decyzje domeny; każda nowa migracja wymaga osobnego zakresu. |
| [docs/architecture/03_ARCHITECTURAL_OBJECTS.md](../architecture/03_ARCHITECTURAL_OBJECTS.md) | SUBORDINATE | Obiekty koncepcyjne; nie deklaracja istnienia wszystkich tabel. |
| [docs/architecture/04_CLIENT_SAFE_SURFACES.md](../architecture/04_CLIENT_SAFE_SURFACES.md) | SUBORDINATE | Client-safe boundaries rozwijane przez dokładniejszy kontrakt10. |
| [docs/architecture/05_TRAINER_WORKSPACE.md](../architecture/05_TRAINER_WORKSPACE.md) | SUBORDINATE | Workspace trenera; docelową hierarchię i priorytety określa Master. |
| [docs/architecture/06_REPORT_GENERATION_ARCHITECTURE.md](../architecture/06_REPORT_GENERATION_ARCHITECTURE.md) | SUBORDINATE | Raport i zatwierdzanie; rozszerzona historia zmiany pozostaje roadmapą. |
| [docs/architecture/07_DECISION_ARCHITECTURE.md](../architecture/07_DECISION_ARCHITECTURE.md) | SUBORDINATE | Decyzje trenera; Master nie wprowadza priority/SLA Decision Engine. |
| [docs/architecture/08_INFORMATION_FLOW.md](../architecture/08_INFORMATION_FLOW.md) | SUBORDINATE | Przepływ informacji; niezależne typy/lifecycle doprecyzowane w10. |
| [docs/architecture/09_SECURITY_RUNTIME_ARCHITECTURE.md](../architecture/09_SECURITY_RUNTIME_ARCHITECTURE.md) | SUBORDINATE | Authoritative security runtime; dawna diagnoza localStorage historyczna. |
| [docs/architecture/10_INFORMATION_PROVENANCE_AND_APPROVAL_CONTRACT.md](../architecture/10_INFORMATION_PROVENANCE_AND_APPROVAL_CONTRACT.md) | SUBORDINATE | Authoritative 9 typów, provenance, niezależne review/publication i widoczność. |
| [docs/architecture/11_AI_RUNTIME_AND_PROVIDER_CONTRACT.md](../architecture/11_AI_RUNTIME_AND_PROVIDER_CONTRACT.md) | SUBORDINATE | Authoritative AI/provider gates; Master nie autoryzuje runtime AI. |
| [docs/architecture/12_FILE_INGESTION_AND_SOURCE_INTEGRITY_CONTRACT.md](../architecture/12_FILE_INGESTION_AND_SOURCE_INTEGRITY_CONTRACT.md) | SUBORDINATE | Authoritative ingestion, integralność źródła i quarantine; bez nowego upload flow. |
| [docs/architecture/13_DATA_LIFECYCLE_ACCESS_AUDIT_AND_DELETION_CONTRACT.md](../architecture/13_DATA_LIFECYCLE_ACCESS_AUDIT_AND_DELETION_CONTRACT.md) | SUBORDINATE | Authoritative access/audit/deletion gates; nierozstrzygnięcia prawne nie są zamknięte przez Master. |
| [docs/architecture/14_STAGE_1_DOMAIN_MAPPING_AND_ACCEPTANCE.md](../architecture/14_STAGE_1_DOMAIN_MAPPING_AND_ACCEPTANCE.md) | SUBORDINATE | Zaakceptowane mapowanie i acceptance; nie zgoda na nowy storage/role. |
| [docs/architecture/15_STAGE_2_INQUIRY_PHONE_DECISION_CONTRACT.md](../architecture/15_STAGE_2_INQUIRY_PHONE_DECISION_CONTRACT.md) | HISTORICAL | Kontrakt fikcyjnego prototypu; jego enumy nie są produkcyjnymi enumami ADR20. |
| [docs/architecture/16_STAGE_3_FULL_INTAKE_PWD_PREPARATION_CONTRACT.md](../architecture/16_STAGE_3_FULL_INTAKE_PWD_PREPARATION_CONTRACT.md) | SUBORDINATE | Szczegóły Stage3 source/intake; prototyp nie dowodzi produkcyjnego intake. |
| [docs/architecture/17_STAGE_4_PWD_DECISION_CONVERSATION_CONTRACT.md](../architecture/17_STAGE_4_PWD_DECISION_CONVERSATION_CONTRACT.md) | SUBORDINATE | Szczegóły PWD/provenance i handoff; minimalny runtime #35 nie realizuje automatycznie całego kontraktu. |
| [docs/architecture/18_STAGE_5_TWELVE_WEEK_GUIDANCE_AND_ADAPTATION_LOOP_CONTRACT.md](../architecture/18_STAGE_5_TWELVE_WEEK_GUIDANCE_AND_ADAPTATION_LOOP_CONTRACT.md) | SUBORDINATE | Szczegóły Stage5 publikacji/delivery/retirement; zachowane przyszłe kryteria, nie pełna deklaracja wdrożenia. |
| [docs/architecture/19_STAGE_2_PRODUCTION_RUNTIME_CONTRACT.md](../architecture/19_STAGE_2_PRODUCTION_RUNTIME_CONTRACT.md) | SUBORDINATE | Aktywny kontrakt ze scoped amendment ADR20 i 21–22; dawne candidate labels historyczne. |
| [docs/architecture/20_STAGE_2_PRODUCTION_IMPLEMENTATION_ADR.md](../architecture/20_STAGE_2_PRODUCTION_IMPLEMENTATION_ADR.md) | KEEP | Jawna decyzja ograniczająca Stage2 schema/runtime; nie ogólne pierwszeństwo nad Konstytucją. |
| [docs/architecture/21_STAGE_2B_PUBLIC_INQUIRY_INGRESS_CONTRACT.md](../architecture/21_STAGE_2B_PUBLIC_INQUIRY_INGRESS_CONTRACT.md) | SUBORDINATE | Authoritative public ingress safety; notification tylko jako wyjątek kontraktu22. |
| [docs/architecture/22_STAGE_2C_TRAINER_INQUIRY_NOTIFICATION_CONTRACT.md](../architecture/22_STAGE_2C_TRAINER_INQUIRY_NOTIFICATION_CONTRACT.md) | SUBORDINATE | Authoritative no-PII, created-only notification; nie client automation. |
| [docs/architecture/README.md](../architecture/README.md) | SUBORDINATE | Indeks kontraktów; Master kierunek, szczegółowe granice zachowują autorytet. |
| [docs/architecture/STUDIO_LAS_SYNC_SERVICE_DESIGN.md](../architecture/STUDIO_LAS_SYNC_SERVICE_DESIGN.md) | SUPERSEDED | Local persistence/offline queue zastąpione remote-only Architecture09 i DATA_POLICY. |
| [docs/architecture/WORK_SPLIT_CHATGPT_CODEX.md](../architecture/WORK_SPLIT_CHATGPT_CODEX.md) | HISTORICAL | Dawny podział pracy i ograniczenia środowiska; nie zgoda na fallback lub delegowanie. |
| [docs/constitution/00_IDENTITY_AND_MISSION.md](../constitution/00_IDENTITY_AND_MISSION.md) | KEEP | Najwyższa aktywna warstwa granic i tożsamości; Owner Decision doprecyzowuje filozofię i medium. |
| [docs/constitution/01_DECISION_HIERARCHY.md](../constitution/01_DECISION_HIERARCHY.md) | KEEP | Najwyższa aktywna warstwa granic i tożsamości; Owner Decision doprecyzowuje filozofię i medium. |
| [docs/constitution/02_NON_NEGOTIABLES.md](../constitution/02_NON_NEGOTIABLES.md) | KEEP | Najwyższa aktywna warstwa granic i tożsamości; Owner Decision doprecyzowuje filozofię i medium. |
| [docs/constitution/03_PRODUCT_BOUNDARIES.md](../constitution/03_PRODUCT_BOUNDARIES.md) | KEEP | Najwyższa aktywna warstwa granic i tożsamości; Owner Decision doprecyzowuje filozofię i medium. |
| [docs/constitution/04_CONSTITUTION_GOVERNANCE.md](../constitution/04_CONSTITUTION_GOVERNANCE.md) | KEEP | Najwyższa aktywna warstwa granic i tożsamości; Owner Decision doprecyzowuje filozofię i medium. |
| [docs/constitution/README.md](../constitution/README.md) | KEEP | Najwyższa aktywna warstwa granic i tożsamości; Owner Decision doprecyzowuje filozofię i medium. |
| [docs/deployment/01_SUPABASE_SECURITY_ROLLOUT.md](../deployment/01_SUPABASE_SECURITY_ROLLOUT.md) | KEEP | Bramki bezpiecznego rollout; kolejność historyczna nie autoryzuje nowego wdrożenia. |
| [docs/deployment/02_SUPABASE_AUTH_CONFIGURATION_GATE.md](../deployment/02_SUPABASE_AUTH_CONFIGURATION_GATE.md) | KEEP | Gate Auth; przykłady target/callback historyczne wobec #56. |
| [docs/deployment/03_CURRENT_SUPABASE_AUDIT.md](../deployment/03_CURRENT_SUPABASE_AUDIT.md) | HISTORICAL | Datowany przegląd/dowód w określonym środowisku; nie bieżący audyt live ani zgoda na rollout. |
| [docs/deployment/04_STAGING_EDGE_FUNCTION_EVIDENCE.md](../deployment/04_STAGING_EDGE_FUNCTION_EVIDENCE.md) | HISTORICAL | Datowany przegląd/dowód w określonym środowisku; nie bieżący audyt live ani zgoda na rollout. |
| [docs/deployment/05_PRODUCTION_TARGET_SCHEMA_DRIFT.md](../deployment/05_PRODUCTION_TARGET_SCHEMA_DRIFT.md) | HISTORICAL | Datowany przegląd/dowód w określonym środowisku; nie bieżący audyt live ani zgoda na rollout. |
| [docs/deployment/06_TARGET_BACKUP_AND_RESTORE.md](../deployment/06_TARGET_BACKUP_AND_RESTORE.md) | KEEP | Wymagania i dowody backup/restore w swoim zakresie; nie nowa próba restore. |
| [docs/deployment/07_FINAL_SECURITY_REGRESSION_2026-07-21.md](../deployment/07_FINAL_SECURITY_REGRESSION_2026-07-21.md) | HISTORICAL | Datowany przegląd/dowód w określonym środowisku; nie bieżący audyt live ani zgoda na rollout. |
| [docs/governance/00_SOURCE_OF_TRUTH_REGISTRY.md](../governance/00_SOURCE_OF_TRUTH_REGISTRY.md) | KEEP | Właściciele szczegółowych pojęć; hierarchia uzgodniona z Master. |
| [docs/governance/02_OFFER_AND_PRICING_GOVERNANCE.md](../governance/02_OFFER_AND_PRICING_GOVERNANCE.md) | KEEP | Odrębny właściciel oferty/cen; bez zmian i bez wnioskowania z benchmarku. |
| [docs/governance/03_PRODUCTION_OWNER_DECISIONS.md](../governance/03_PRODUCTION_OWNER_DECISIONS.md) | KEEP | Decyzje i gates właściciela; obserwacje historyczne nie zastępują bieżącego dowodu. |
| [docs/prd/001_REPORT_SYSTEM_V1.md](../prd/001_REPORT_SYSTEM_V1.md) | SUBORDINATE | Szczegółowy zakres i acceptance; zachowane safety/provenance/publication, bez deklaracji pełnego wdrożenia. |
| [docs/prd/002_INQUIRY_TO_PHONE_DECISION_V1.md](../prd/002_INQUIRY_TO_PHONE_DECISION_V1.md) | HISTORICAL | Akceptacja prototypu Stage2; nie produkcyjny model danych. |
| [docs/prd/003_FULL_INTAKE_PWD_PREPARATION_V1.md](../prd/003_FULL_INTAKE_PWD_PREPARATION_V1.md) | SUBORDINATE | Szczegółowy zakres i acceptance; zachowane safety/provenance/publication, bez deklaracji pełnego wdrożenia. |
| [docs/prd/004_PWD_DECISION_CONVERSATION_V1.md](../prd/004_PWD_DECISION_CONVERSATION_V1.md) | SUBORDINATE | Szczegółowy zakres i acceptance; zachowane safety/provenance/publication, bez deklaracji pełnego wdrożenia. |
| [docs/prd/005_TWELVE_WEEK_GUIDANCE_AND_ADAPTATION_LOOP_V1.md](../prd/005_TWELVE_WEEK_GUIDANCE_AND_ADAPTATION_LOOP_V1.md) | SUBORDINATE | Szczegółowy zakres i acceptance; zachowane safety/provenance/publication, bez deklaracji pełnego wdrożenia. |
| [docs/product/00_PRODUCT_MODEL.md](../product/00_PRODUCT_MODEL.md) | SUBORDINATE | Model produktu rozwijający Master, bez fitness/SaaS/AI coach. |
| [docs/product/01_CLIENT_JOURNEY.md](../product/01_CLIENT_JOURNEY.md) | SUBORDINATE | Podróż klienta, bez wymuszania automatycznych etapów. |
| [docs/product/02_STUDIO_LAS_METHOD.md](../product/02_STUDIO_LAS_METHOD.md) | SUBORDINATE | Metoda i human-led interpretation; Master nie zmienia metodologii. |
| [docs/product/03_COACHING_SYSTEM.md](../product/03_COACHING_SYSTEM.md) | SUBORDINATE | Coaching trenera; paper/app rozumiane według Owner Decision per release. |
| [docs/product/04_MEASUREMENT_SYSTEM.md](../product/04_MEASUREMENT_SYSTEM.md) | SUBORDINATE | Pomiary jako kontekst; bez automatycznej interpretacji i priorytetów. |
| [docs/product/05_REPORT_SYSTEM.md](../product/05_REPORT_SYSTEM.md) | SUBORDINATE | Raport zatwierdzany przez trenera; rozbudowana narracja to kierunek. |
| [docs/product/06_HOME_GUIDANCE_SYSTEM.md](../product/06_HOME_GUIDANCE_SYSTEM.md) | SUBORDINATE | Guidance i kanał z decyzją trenera; safety i publikacja zachowane. |
| [docs/product/07_INQUIRY_TO_PHONE_DECISION_SYSTEM.md](../product/07_INQUIRY_TO_PHONE_DECISION_SYSTEM.md) | HISTORICAL | Produktowy prototyp Stage2; produkcyjny następca Architecture19–22/ADR20. |
| [docs/product/08_FULL_INTAKE_AND_PWD_PREPARATION_SYSTEM.md](../product/08_FULL_INTAKE_AND_PWD_PREPARATION_SYSTEM.md) | SUBORDINATE | Stage3 intake/source, nie nowa autoryzacja produkcyjnego formularza. |
| [docs/product/09_PWD_WORKSPACE_AND_DECISION_CONVERSATION_SYSTEM.md](../product/09_PWD_WORKSPACE_AND_DECISION_CONVERSATION_SYSTEM.md) | SUBORDINATE | PWD conversation i handoff; bez automatycznej publikacji Guidance. |
| [docs/product/10_TWELVE_WEEK_GUIDANCE_AND_ADAPTATION_LOOP.md](../product/10_TWELVE_WEEK_GUIDANCE_AND_ADAPTATION_LOOP.md) | SUBORDINATE | Stage5 loop; zachowane dokładne gates i hipotezy usability, nie potwierdzona pełna realizacja. |
| [docs/product/PRODUCT_RECOVERY_AUDIT_2026-07-22.md](../product/PRODUCT_RECOVERY_AUDIT_2026-07-22.md) | HISTORICAL | Datowany punkt wyjścia recovery, nie bieżący backlog. |
| [docs/product/PRODUCT_RECOVERY_EXECUTION_PLAN.md](../product/PRODUCT_RECOVERY_EXECUTION_PLAN.md) | SUBORDINATE | Historia akceptacji do 2026-08-24; aktualna roadmapa Master; późniejsze PR tylko w swoim zakresie. |
| [docs/product/README.md](../product/README.md) | SUBORDINATE | Indeks warstwy Product pod Master; odsyłacz do wiążącej Owner Decision. |
| [docs/product/STAGE_3_SOURCE_ARTIFACT_MANIFEST.md](../product/STAGE_3_SOURCE_ARTIFACT_MANIFEST.md) | KEEP | Manifest i integralność źródeł Stage3; Master nie redefiniuje pochodzenia. |
| [docs/reviews/2026-07-07_STAGE_1_STAGE_2_CONSISTENCY_REVIEW.md](2026-07-07_STAGE_1_STAGE_2_CONSISTENCY_REVIEW.md) | HISTORICAL | Datowany przegląd/dowód w określonym środowisku; nie bieżący audyt live ani zgoda na rollout. |
| [docs/reviews/2026-09-01_STAGE_2_PRODUCTION_GAP_AUDIT.md](2026-09-01_STAGE_2_PRODUCTION_GAP_AUDIT.md) | HISTORICAL | Datowany przegląd/dowód w określonym środowisku; nie bieżący audyt live ani zgoda na rollout. |
| [docs/reviews/2026-09-01_STAGE_2_PRODUCTION_RUNTIME_CONTRACT_REVIEW.md](2026-09-01_STAGE_2_PRODUCTION_RUNTIME_CONTRACT_REVIEW.md) | HISTORICAL | Datowany przegląd/dowód w określonym środowisku; nie bieżący audyt live ani zgoda na rollout. |
| [docs/reviews/2026-09-07_MASTER_SPEC_1_1_RECONCILIATION.md](2026-09-07_MASTER_SPEC_1_1_RECONCILIATION.md) | HISTORICAL | Datowany przegląd/dowód w określonym środowisku; nie bieżący audyt live ani zgoda na rollout. |
| [prototypes/client-guidance-loop-v1/README.md](../../prototypes/client-guidance-loop-v1/README.md) | HISTORICAL | Fikcyjny workflow lub jego datowany audyt; dowód prototypu, nie produkcyjny kontrakt ani schema. |
| [prototypes/stage-2-inquiry-phone-decision/AUDIT_2026-08-10.md](../../prototypes/stage-2-inquiry-phone-decision/AUDIT_2026-08-10.md) | HISTORICAL | Fikcyjny workflow lub jego datowany audyt; dowód prototypu, nie produkcyjny kontrakt ani schema. |
| [prototypes/stage-2-inquiry-phone-decision/README.md](../../prototypes/stage-2-inquiry-phone-decision/README.md) | HISTORICAL | Fikcyjny workflow lub jego datowany audyt; dowód prototypu, nie produkcyjny kontrakt ani schema. |
| [prototypes/stage-3-full-intake-pwd-preparation/AUDIT_2026-08-10.md](../../prototypes/stage-3-full-intake-pwd-preparation/AUDIT_2026-08-10.md) | HISTORICAL | Fikcyjny workflow lub jego datowany audyt; dowód prototypu, nie produkcyjny kontrakt ani schema. |
| [prototypes/stage-3-full-intake-pwd-preparation/README.md](../../prototypes/stage-3-full-intake-pwd-preparation/README.md) | HISTORICAL | Fikcyjny workflow lub jego datowany audyt; dowód prototypu, nie produkcyjny kontrakt ani schema. |
| [prototypes/stage-4-pwd-decision-conversation/README.md](../../prototypes/stage-4-pwd-decision-conversation/README.md) | HISTORICAL | Fikcyjny workflow lub jego datowany audyt; dowód prototypu, nie produkcyjny kontrakt ani schema. |
| [supabase/IMPORTER_DESIGN.md](../../supabase/IMPORTER_DESIGN.md) | HISTORICAL | Projekt/procedura importera i testowe dowody; bez importu, migracji lub modyfikacji pliku w tym pass. |
| [supabase/MIGRATION_NOTES.md](../../supabase/MIGRATION_NOTES.md) | SUBORDINATE | Dokumentacja implementacji/migracji/walidacji; zachowane bezpieczeństwo i scope, bez zmian w supabase/.  |
| [supabase/README.md](../../supabase/README.md) | SUBORDINATE | Dokumentacja implementacji/migracji/walidacji; zachowane bezpieczeństwo i scope, bez zmian w supabase/.  |
| [supabase/importer/FIRST_TEST_APPLY_GUIDE.md](../../supabase/importer/FIRST_TEST_APPLY_GUIDE.md) | HISTORICAL | Projekt/procedura importera i testowe dowody; bez importu, migracji lub modyfikacji pliku w tym pass. |
| [supabase/importer/README.md](../../supabase/importer/README.md) | HISTORICAL | Projekt/procedura importera i testowe dowody; bez importu, migracji lub modyfikacji pliku w tym pass. |
| [supabase/importer/apply_test_notes.md](../../supabase/importer/apply_test_notes.md) | HISTORICAL | Projekt/procedura importera i testowe dowody; bez importu, migracji lub modyfikacji pliku w tym pass. |
| [supabase/tests/RUN_RUNTIME_VALIDATION.md](../../supabase/tests/RUN_RUNTIME_VALIDATION.md) | SUBORDINATE | Dokumentacja implementacji/migracji/walidacji; zachowane bezpieczeństwo i scope, bez zmian w supabase/.  |

**Pokrycie:** 92 dokumentów (90 śledzonych w bazie + 2 nowe). KEEP: 16, SUBORDINATE: 43, SUPERSEDED: 3, HISTORICAL: 30, CONFLICT: 0.

## Gdzie dodano jawne statusy

Nowe adnotacje zakresu: domain model; Architecture09,19,21 i stary sync design; Product07 i execution plan; owner decisions03; Auth configuration gate02; DEV_TESTING_URLS. Wejścia README, Constitution README, Product/Architecture README i registry uaktualniają hierarchię oraz filozofię. To 15 istniejących plików z małymi zmianami; poza nimi dodano Master i ten raport. Pozostałe statusy są w macierzy: nie powielano nagłówków w każdym pliku, nie usuwano historii Paper First ani nie przepisywano zaakceptowanych kontraktów.

## Weryfikacja i ograniczenia

W tym pass przeszły lokalnie:

- `python scripts/verify_studio_las_os.py` — static security/architecture.
- `python scripts/verify_access_lifecycle.py` — static access lifecycle.
- `python scripts/verify_trainer_mfa.py` — static MFA/AAL2.
- `node scripts/test_trainer_mfa.mjs` — lokalny harness MFA.
- `node scripts/test_pwd_trainer_workflow.mjs` — atomowy kontrakt klient/domain/static; bez wykonania SQL.
- `node scripts/test_guidance_release_workflow.mjs` — static invariants; bez wykonania SQL.
- `node scripts/test_decision_state_integrity.mjs` — persistence/domain/UI static contract z fikcyjnymi repozytoriami.

Node zgłasza istniejący warning MODULE_TYPELESS_PACKAGE_JSON; testy kończą się kodem 0. Nie zmieniano package configuration. Kontrola dokumentacji: PASS dla 129 nowych linków lokalnych/anchorów, 92 unikalnych pozycji klasyfikacji, niezmienionego SHA-256 źródła i 17 ścieżek wyłącznie Markdown. Diff względem oryginału 1.1 sprawdzono; `git diff --cached --check` po normalizacji hard breaks przechodzi bez błędów. Nie uruchamiano SQL, testów zdalnego staging, browser E2E z kontami, build, deploy, migracji, importera ani operacji na klientach. Wyniki statyczne nie zastępują live RLS ani testów usability.

Pozostałe ryzyka: administracyjnie otwarte #57 i odrębne dowody rollout; niewdrożone części phase-aware UI/Change Evidence/Unified Process View; niepotwierdzone przez ten pass cele czasu obsługi i pełna przyszła zgodność Stage3–5; historyczne instrukcje nadal dostępne, lecz jawnie sklasyfikowane. Żadne z nich nie stanowi nowego rozstrzygnięcia P0/P1 ani uprawnienia do wdrożenia.

## Niezmieniony zakres

```text
runtime unchanged
Supabase unchanged
production unchanged
Netlify unchanged
main unchanged
no client data modified
```

Dodatkowo: bez zmian migracji, schematu i enumów; bez merge; bez porządkowania obcego brudnego checkoutu. Publikowany jest wyłącznie dokumentacyjny branch i Draft PR do `product-recovery`.
