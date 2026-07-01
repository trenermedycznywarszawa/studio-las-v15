# StudioLasSyncService Design

Ten dokument jest kontraktem implementacyjnym dla pierwszego bezpiecznego write layer w Studio Las OS.

Nie implementuje kodu, migracji ani zmian UI. Nie przepisuje aplikacji na Reacta. Nie zmienia obecnego read layer. Nie usuwa fallbacku localStorage.

Inspiracja jest wzorzec offline queue z PierreTsia/workout-app: lokalna kolejka per zalogowany uzytkownik, deterministyczny fingerprint, serializowany drainQueue, zostawianie nieudanych elementow w kolejce i ochrona eventow dodanych podczas trwajacej synchronizacji. Adaptacja dla Studio Las OS dotyczy prywatnego procesu 1:1, nie fitness trackera.

## 1. PR 0 - Sync Contract

PR 0 obejmuje tylko ten dokument.

Zakres PR 0:

- doprecyzowanie docs/architecture/STUDIO_LAS_SYNC_SERVICE_DESIGN.md,
- brak zmian w studio-management-os-3.0.html,
- brak migracji Supabase,
- brak implementacji SyncService,
- brak zmian UI,
- commit dokumentu do repo.

Kryterium akceptacji PR 0:

- dokument rozstrzyga identyfikatory, _sync, remote_id, kolejke, dedupe, drain i mapowanie eventow,
- kazdy event/source V1 ma jeden target Supabase,
- V1 ma zasade: jeden event, jedna tabela, jeden upsert,
- plan implementacji nie wymaga zgadywania kontraktu.

## 2. Zakres i nie-cele

StudioLasSyncService V1 obsluguje tylko dane procesowe trenera:

- notatke trenera,
- decyzje trenera,
- sygnal z sesji,
- zadanie domowe lub organizacyjne dla klienta,
- pomiar skladu ciala,
- material do raportu wynikajacy z powyzszych danych.

Poza zakresem V1:

- sety, serie, PR-y, heatmapy, achievementy i gamifikacja,
- AI-generowanie treningow,
- automatyczna integracja Polar/Tanita,
- zmiana architektury na React lub framework,
- przebudowa obecnego read layer,
- usuniecie zapisu do localStorage,
- upload PDF Tanita do Supabase Storage,
- kasowanie rekordow z Supabase.

## 3. Audyt obecnych miejsc zapisu w studio-management-os-3.0.html

Numery linii odnosza sie do aktualnego pliku studio-management-os-3.0.html w repozytorium studio-las-v15 na galezi main.

| Obszar | Obecne miejsce zapisu | Co zapisuje teraz | Decyzja dla SyncService V1 |
| --- | --- | --- | --- |
| Glowny state | STORAGE_KEY = studioLasOS_v3 ok. 1644; load() ok. 5561-5574; save() ok. 5577-5580 | Caly state jako jeden JSON w localStorage. | Zachowac jako pierwszy zapis i fallback. Event do kolejki dopiero po udanym save(). |
| Biblioteka cwiczen | getExerciseLibrary() / saveExerciseLibrary() ok. 4114-4128; seed versions ok. 4271-4289 | Osobny localStorage dla atlasu cwiczen. | Poza V1. |
| Guidance i pilot | GUIDANCE_STORAGE_KEY, GUIDANCE_PILOT_STORAGE_KEY ok. 1646-1647; saveGuidanceState() / savePilotStore() ok. 5618-5689 | Osobne stany checklist/pilota. | Poza V1. |
| Supabase REST helper | createStudioLasSupabaseDataService() ok. 4810-4894 | request() i mutate() dla REST API. | Reuzyc konfiguracje i styl bledu, bez zmiany read layer. |
| Supabase read bootstrap | loadDashboardState() ok. 4922-4968 | Czyta clients, sessions, body_measurements, reports, client_intakes. | Nie zmieniac w V1. |
| Supabase klient create/update | supabaseInsertClient(), supabaseUpdateClient() ok. 5451-5477; handler klienta ok. 12898-12943 | Obecny write preview dla clients. | Nie podpinac pod offline queue V1. |
| Check przed sesja | savePreSessionCheck() ok. 6931-6952 | Dodaje c.preSessionChecks: flagi, plannedDecision, note, potem save(). | trainer_decision_saved / pre_session_check -> pre_session_checks. |
| Notatka po sesji | savePostSessionNote() ok. 6952-6976 | Dodaje c.postSessionNotes; homeTask dodaje c.tasks. | session_note_saved -> post_session_observations; decyzja i homeTask jako osobne eventy. |
| Zadania klienta | renderTasks() i #taskForm ok. 7450-7502 | Dodaje c.tasks; checkbox zmienia done; potem save(). | client_task_saved -> client_tasks. Wymaga lokalnego id i _sync. |
| Wynik testu | saveDiagnosticResult() ok. 11376-11418 | Dodaje lub edytuje c.testResults. | Poza V1. |
| Plan domowy | saveManualHomePlanExercise() i addExerciseToActiveHomePlan() ok. 11556-11610 | Dodaje c.homePlan.exercises. | Poza V1; nie mieszac z client_tasks. |
| Pomiar Tanita | #measurementForm submit ok. 12952-13009 | Tworzy/edytuje measurement z liczbami, interpretacja, summary i lokalnym PDF data URL. | body_measurement_saved -> body_measurements; PDF zostaje lokalny. |
| Odczyt Polar | #polarForm submit ok. 13016-13045 | Dodaje/edytuje c.polarSessions. | Poza V1. |
| Sesja | #sessionForm submit ok. 13047-13073 | Dodaje session z metrykami, notes, decision, milestone; potem save(). | session_note_saved / session_form -> sessions; decyzja jako osobny trainer_decision_saved / session_decision. |
| Raport | #saveReportBtn ok. 9643-9653 | Dodaje snapshot raportu do c.reports. | Poza V1. |
| Usuwanie lokalne | deleteMeasurement() ok. 9305-9310; deletePolarSession() ok. 9315-9320 | Usuniecia w lokalnym state przez save(). | Poza V1; pierwszy write layer upsertuje, nie usuwa. |

Wniosek: SyncService ma byc cienka warstwa po save(), nie zamiennik save() i nie nowe zrodlo prawdy dla UI.

## 4. Identyfikatory i odpowiedzialnosci

W V1 nie wolno uzywac dwuznacznego user_id. Kontrakt wymaga trzech jawnych identyfikatorow.

| Identyfikator | Zrodlo | Do czego sluzy | Do czego nie sluzy |
| --- | --- | --- | --- |
| auth_user_id | Supabase Auth JWT sub / auth.uid() | Klucz kolejki localStorage; separacja kolejek po koncie auth; rozpoznanie sesji auth. | Nie jest foreign key w tabelach procesowych. |
| trainer_profile_id | profiles.id dla profilu z role = trainer; w aplikacji activeTrainerProfileId | RLS, trainer_can_access_client(client_id), created_by tam gdzie tabela to ma, powiazanie trenera z klientem. | Nie jest kluczem kolejki. |
| client_id | Supabase clients.id zapisany w lokalnym state.clients[] | Foreign key kazdego eventu; RLS writes; powiazanie danych z klientem. | Nie sluzy do separacji kolejek miedzy kontami. |

Zastosowanie:

- klucz kolejki localStorage: studioLasOfflineQueue:v1:{auth_user_id},
- pole kolejki auth_user_id: zawsze Supabase auth user id,
- pole kolejki trainer_profile_id: profiles.id trenera; wymagane do drenażu, moze byc null przy lokalnym enqueue przed bootstrapem,
- pole kolejki client_id: Supabase clients.id; wymagane do drenażu,
- RLS/Supabase writes: opieraja sie na JWT oraz funkcjach current_profile_id() i trainer_can_access_client(client_id), nie na zaufaniu do payloadu,
- powiazanie klienta z trenerem: clients.owner_trainer_id i client_trainers.

Jesli auth_user_id nie jest znany, nie tworzyc kolejki globalnej i nie drenowac. Jesli trainer_profile_id albo client_id nie sa znane, event moze zostac zapisany lokalnie tylko jako local/queued-local, ale drain musi poczekac.

## 5. remote_id i lokalne metadane _sync

Kazdy lokalny obiekt, ktory moze byc wyslany do Supabase, musi miec _sync.

Minimalny format:

```json
{
  "_sync": {
    "remote_id": "uuid",
    "sync_status": "local",
    "last_queued_at": null,
    "last_synced_at": null,
    "last_error": null
  }
}
```

Dozwolone sync_status V1:

- local - zapisany lokalnie, jeszcze nie zakolejkowany albo Supabase nie jest gotowy,
- queued - event jest w kolejce,
- syncing - trwa probny remote upsert,
- synced - ostatnia wersja zostala potwierdzona w Supabase,
- error - ostatni remote upsert sie nie udal; dane zostaja lokalnie.

remote_id generujemy w momencie pierwszego lokalnego zapisu obiektu, zanim event trafi do kolejki:

1. handler formularza buduje lub aktualizuje lokalny obiekt,
2. ensureSyncMeta(localObject) sprawdza _sync.remote_id,
3. jesli go nie ma, generuje UUID przez crypto.randomUUID(),
4. _sync.remote_id zostaje zapisany w lokalnym obiekcie,
5. obecny save() zapisuje state do localStorage,
6. dopiero po udanym save() powstaje event z payload.remote_id = localObject._sync.remote_id.

Nie wolno generowac remote_id dopiero w drainQueue. Refresh przed drenażem moglby wtedy utworzyc drugi remote_id i drugi rekord.

Miejsca _sync w lokalnym state:

- c.sessions[]._sync,
- c.preSessionChecks[]._sync,
- c.postSessionNotes[]._sync,
- c.tasks[]._sync,
- c.measurements[]._sync.

Dla c.tasks[] trzeba dodac stabilne lokalne id, bo obecnie proste zadania moga go nie miec.

```json
{
  "id": "task-1719820000000",
  "text": "Spacer 15 minut",
  "done": false,
  "createdAt": "2026-07-01",
  "_sync": {
    "remote_id": "uuid",
    "sync_status": "queued",
    "last_queued_at": "2026-07-01T12:30:00.000Z",
    "last_synced_at": null,
    "last_error": null
  }
}
```

Jak remote_id przetrwa refresh:

- _sync jest czescia tego samego state zapisywanego przez save() pod studioLasOS_v3,
- load() odczytuje state,
- migrateState() musi zachowac _sync,
- ponowny zapis tego samego obiektu uzywa tego samego remote_id,
- fingerprint kolejki nadal wskazuje ten sam target.

Jak unikamy drugiego rekordu:

- lokalny obiekt ma trwale _sync.remote_id,
- event ma payload.remote_id skopiowany z lokalnego obiektu,
- procesor Supabase robi upsert z id = payload.remote_id,
- ponowny zapis przed synchronizacja zastepuje pending item po fingerprint,
- ponowny zapis po synchronizacji tworzy nowy pending item z tym samym remote_id, czyli update tego samego rekordu.

## 6. Schemat offline_queue

To jest lokalny schemat rekordu kolejki w localStorage, nie tabela Supabase w V1.

| Pole | Typ | Znaczenie |
| --- | --- | --- |
| id | string | Id elementu kolejki, np. oq_{timestamp}_{random}. Nie jest id rekordu docelowego. |
| auth_user_id | string | Supabase Auth user id; musi zgadzac sie z kluczem kolejki. |
| trainer_profile_id | string lub null | profiles.id trenera; wymagany do drenażu, moze byc null przy enqueue przed bootstrapem. |
| client_id | string | Supabase clients.id; wymagany do drenażu. |
| local_session_id | string lub null | Lokalny identyfikator grupy: sesja, notatka, check, zadanie albo pomiar. Nazwa zostaje dla kompatybilnosci wzorca, ale nie zawsze oznacza sesje. |
| event_type | string | Jedno z eventow V1. |
| source | string | Jedno z dopuszczonych source dla eventu. |
| target_table | string | Jedna jawna tabela Supabase dla event_type/source. |
| payload | object | Dane eventu, w tym schema_version i remote_id. |
| fingerprint | string | Deterministyczny identyfikator dedupe kolejki. |
| queued_at | string | ISO timestamp dodania albo ostatniego zastapienia. |
| retry_count | number | Liczba nieudanych prob; start 0. |
| last_error | string lub null | Skrocony blad bez danych wrazliwych. |

Przyklad:

```json
{
  "id": "oq_2026-07-01T12:30:00.000Z_b7c2",
  "auth_user_id": "auth-user-uuid",
  "trainer_profile_id": "trainer-profile-uuid",
  "client_id": "client-uuid",
  "local_session_id": "post1719820000000",
  "event_type": "session_note_saved",
  "source": "post_session_note",
  "target_table": "post_session_observations",
  "payload": {
    "schema_version": 1,
    "source": "post_session_note",
    "remote_id": "post-observation-uuid",
    "local_note_id": "post1719820000000",
    "date": "2026-07-01",
    "what_we_did": "...",
    "client_response": "...",
    "client_message": "..."
  },
  "fingerprint": "session_note_saved:post_session_note:client-uuid:post-observation-uuid",
  "queued_at": "2026-07-01T12:30:00.000Z",
  "retry_count": 0,
  "last_error": null
}
```

## 7. Eventy V1 i jednoznaczne targety

V1 ma zasade: jeden event, jeden source, jedna target table, jeden upsert. Jeden submit formularza moze utworzyc kilka eventow, ale kazdy event jest drenowany osobno.

### session_note_saved

| Source | Target | Payload minimum |
| --- | --- | --- |
| session_form | sessions | remote_id, local_session_id, date, readiness, vas_before, vas_after, mobility_index, sleep_quality, exercises_text, trainer_observation, milestone |
| post_session_note | post_session_observations | remote_id, local_note_id, date, what_we_did, client_response, home_task_text, client_message |

### trainer_decision_saved

| Source | Target | Payload minimum |
| --- | --- | --- |
| pre_session_check | pre_session_checks | remote_id, local_check_id, check_date, pain_increased, poor_sleep, home_plan_done, new_symptoms, red_flag_concern, planned_decision, trainer_note |
| session_decision | sessions | remote_id, local_session_id, date, trainer_decision |
| post_session_decision | post_session_observations | remote_id, local_note_id, date, decision |

### client_task_saved

| Source | Target | Payload minimum |
| --- | --- | --- |
| task_form | client_tasks | remote_id, local_task_id, text, completed, created_at, completed_at |
| post_session_home_task | client_tasks | remote_id, local_task_id, text, completed, created_at, completed_at |

Plan domowy nie wchodzi do client_task_saved w V1. To pozniejszy target home_plans/home_plan_items.

### body_measurement_saved

| Source | Target | Payload minimum |
| --- | --- | --- |
| tanita_form | body_measurements | remote_id, local_measurement_id, measured_at, source, input_method, parse_status, parsed_fields, wszystkie metryki liczbowe, trainer_interpretation, client_summary |

PDF Tanita nie idzie do Supabase w V1.

## 8. Fingerprint i dedupe

Reguly:

- fingerprint nie zawiera tresci notatki ani wartosci pomiaru,
- fingerprint wskazuje ten sam docelowy rekord i ten sam event/source,
- ponowny zapis tego samego lokalnego obiektu przed synchronizacja zastepuje poprzedni pending item,
- po udanym drenie pozniejsza edycja tworzy nowy pending item z tym samym fingerprintem i nowszym payloadem.

| Event | Source | Target | Fingerprint | Remote dedupe |
| --- | --- | --- | --- | --- |
| session_note_saved | session_form | sessions | session_note_saved:session_form:{client_id}:{remote_id} | Upsert sessions.id = remote_id |
| session_note_saved | post_session_note | post_session_observations | session_note_saved:post_session_note:{client_id}:{remote_id} | Upsert post_session_observations.id = remote_id |
| trainer_decision_saved | pre_session_check | pre_session_checks | trainer_decision_saved:pre_session_check:{client_id}:{remote_id} | Upsert pre_session_checks.id = remote_id |
| trainer_decision_saved | session_decision | sessions | trainer_decision_saved:session_decision:{client_id}:{remote_id} | Upsert sessions.id = remote_id |
| trainer_decision_saved | post_session_decision | post_session_observations | trainer_decision_saved:post_session_decision:{client_id}:{remote_id} | Upsert post_session_observations.id = remote_id |
| client_task_saved | task_form | client_tasks | client_task_saved:task_form:{client_id}:{remote_id} | Upsert client_tasks.id = remote_id |
| client_task_saved | post_session_home_task | client_tasks | client_task_saved:post_session_home_task:{client_id}:{remote_id} | Upsert client_tasks.id = remote_id |
| body_measurement_saved | tanita_form | body_measurements | body_measurement_saved:tanita_form:{client_id}:{remote_id} | Upsert body_measurements.id = remote_id |

Nie wolno dopuszczac eventu z nieznanym event_type/source albo target_table innym niz powyzsze.

## 9. Strategia drainQueue

### 9.1 Serializacja drainow

drainQueue(auth_user_id) jest serializowany przez promise chain albo mutex. Wywolania z zapisu formularza, eventu online, startu aplikacji i recznego retry nie moga rownolegle przetwarzac tej samej kolejki. Jesli drain trwa, kolejne wywolanie czeka w lancuchu.

### 9.2 Jeden event, jedna tabela, jeden upsert

V1 zakazuje scalania eventow.

Procesor bierze jeden item i wykonuje dokladnie jeden upsert do target_table. Przyklad: session_note_saved/session_form robi upsert do sessions, a trainer_decision_saved/session_decision robi osobny upsert do sessions. To moze dac dwa upserty tego samego rekordu, ale jest prostsze do debugowania i bezpieczniejsze jako pierwsza warstwa.

Scalanie eventow w jeden upsert moze byc przyszla optymalizacja po V1.

### 9.3 Snapshot i zapis koncowy

Drain bierze snapshot kolejki na starcie. Po przetworzeniu nie wolno nadpisac calego localStorage sama lista failed items.

Przed zapisem koncowym trzeba ponownie odczytac aktualna kolejke i zachowac eventy dodane podczas drenażu:

- eventy ze snapshotu, ktore sie udaly: usunac,
- eventy ze snapshotu, ktore sie nie udaly: zostawic z retry_count + 1 i last_error,
- eventy dodane podczas drenażu: zachowac,
- jesli ten sam fingerprint zostal dodany podczas drenażu, wygrywa nowszy payload.

### 9.4 Zachowanie przy bledzie

| Typ bledu | Zachowanie |
| --- | --- |
| Offline, timeout, DNS, 5xx | Przerwac biezacy drain, zostawic obecny i nieprzetworzone elementy w kolejce. Ustawic last_error i _sync.sync_status = error. |
| 401/403, brak tokena, wygasla sesja | Przerwac drain. Nie kasowac kolejki. UI pokazuje Blad synchronizacji albo Zapisane lokalnie. |
| RLS/constraint/validation 4xx | Zostawic problematyczny element z last_error; kontynuowac inne niezalezne eventy, jesli ich target nie zalezy od blednego itemu. |
| Blad mapowania payloadu | Nie wysylac. Zostawic w kolejce z czytelnym last_error, bez danych wrazliwych. |

Nie kasowac automatycznie po limicie retry w V1.

### 9.5 Refresh i event podczas synchronizacji

Kolejka i _sync.remote_id sa w localStorage, wiec refresh ich nie usuwa. Start aplikacji wykonuje load(), zachowuje _sync w migrateState(), ustala auth_user_id, po bootstrapie ustala trainer_profile_id i client_id, a potem uruchamia drainQueue(auth_user_id), jesli Supabase jest gotowy i navigator.onLine === true.

Nie uzywac beforeunload jako glownej strategii. Enqueue musi zakonczyc sie przed zamknieciem modalu/formularza.

enqueueEvent() podczas aktywnego drenażu dziala normalnie: zapisuje albo aktualizuje element po fingerprint, ustawia _sync.sync_status = queued, aktualizuje _sync.last_queued_at i nie manipuluje snapshotem aktywnego draina. Aktywny drain przy zapisie koncowym musi wykryc ten nowy element i go zachowac.

## 10. Mapowanie event -> tabela Supabase

Istniejace RLS z migracji 002_rls_policies.sql pozwala trenerowi na select, insert, update dla ponizszych tabel, jesli trainer_can_access_client(client_id). Kazdy wiersz jest osobnym procesorem V1.

| Event | Source | Target Supabase | Klucz idempotencji | Wymagane pola |
| --- | --- | --- | --- | --- |
| session_note_saved | session_form | sessions | id = payload.remote_id | client_id, date, trainer_observation; opcjonalnie metryki sesji i milestone |
| session_note_saved | post_session_note | post_session_observations | id = payload.remote_id | client_id, date, what_we_did, client_response, home_task_text, client_message |
| trainer_decision_saved | pre_session_check | pre_session_checks | id = payload.remote_id | client_id, check_date, flagi checka, planned_decision, trainer_note |
| trainer_decision_saved | session_decision | sessions | id = payload.remote_id | client_id, date, trainer_decision |
| trainer_decision_saved | post_session_decision | post_session_observations | id = payload.remote_id | client_id, date, decision |
| client_task_saved | task_form | client_tasks | id = payload.remote_id | client_id, text, completed, source, completed_at |
| client_task_saved | post_session_home_task | client_tasks | id = payload.remote_id | client_id, text, completed, source, completed_at |
| body_measurement_saved | tanita_form | body_measurements | id = payload.remote_id | client_id, measured_at, source, input_method, parse_status, parsed_fields, metryki, trainer_interpretation, client_summary |

## 11. Minimalne zmiany UI

UI nie dostaje nowego designu. Wystarcza istniejace mechanizmy typu toast() i maly status w topbarze, jesli bedzie potrzebny.

| Stan | Kiedy | Tekst |
| --- | --- | --- |
| Lokalny sukces | Po udanym save() i enqueue | Zapisane lokalnie |
| Synchronizacja | Gdy drainQueue przetwarza kolejke | Synchronizuje |
| Remote sukces | Gdy event lub cala kolejka aktywnego auth usera zostala zapisana | Zapisane w bazie |
| Blad | Gdy kolejka ma last_error albo drain przerwal sie na bledzie | Blad synchronizacji |

Zapisane lokalnie jest normalnym, bezpiecznym stanem offline/fallback.

## 12. Ryzyka migracji z obecnego localStorage

1. Monolityczny state: SyncService musi dostac event z handlera formularza, nie diffowac caly JSON po fakcie.
2. c.tasks moze nie miec stabilnego id: trzeba dodac lokalne id i _sync.remote_id.
3. Lokalne id typu m... albo post... nie sa UUID: do upsert sluzy _sync.remote_id.
4. Klient moze istniec tylko lokalnie: bez pewnego client_id event nie drenowac.
5. PDF Tanita zostaje lokalny: nie wysylac pdfDataUrl do body_measurements w V1.
6. UI czyta z lokalnego state, Supabase dostaje kopie: po bledzie remote nie cofac lokalnego zapisu.
7. Dedupe bez _sync.remote_id jest kruche: remote_id musi powstac przed enqueue.
8. RLS moze zatrzymac event: last_error zostaje w kolejce i w _sync.
9. Edycja zsynchronizowanego rekordu musi zachowac ten sam remote_id.
10. SyncService nie zastepuje importera ani historycznej migracji localStorage.

## 13. Plan implementacji po PR 0

### PR 1 - lokalna kolejka i event adapters bez remote write

Zakres:

- dodac plain JS StudioLasSyncService bez Reacta,
- dodac ensureSyncMeta(), enqueueEvent(), getQueue(), setQueue(), fingerprint i status queue,
- dodac _sync do lokalnych obiektow V1,
- dodac lokalne id do c.tasks[],
- po istniejacym save() w wybranych handlerach enqueue event V1,
- remote drain zostawic wylaczony flaga lub stubem,
- nie zmieniac read layer.

Akceptacja:

- kazdy event V1 pojawia sie w kolejce po lokalnym zapisie,
- refresh nie usuwa kolejki ani _sync.remote_id,
- ponowny zapis tego samego obiektu zastepuje pending event po fingerprint,
- aplikacja dziala tak samo bez Supabase.

### PR 2 - pierwszy remote drain dla pomiarow i zadan

Zakres:

- dodac serializowany drainQueue(auth_user_id),
- dodac body_measurement_saved/tanita_form -> body_measurements,
- dodac client_task_saved/* -> client_tasks,
- uzywac upsert po id = payload.remote_id,
- zachowac eventy dodane podczas trwajacego drain,
- obslugiwac retry_count, last_error i _sync.last_synced_at,
- PDF Tanita nadal zostaje lokalnie.

Akceptacja:

- pomiar i zadanie zapisane offline trafiaja do Supabase po powrocie online/auth,
- retry nie tworzy duplikatu,
- blad RLS/constraint zostawia event w kolejce,
- lokalny zapis nigdy nie jest cofany po bledzie remote.

### PR 3 - notatki i decyzje sesji

Zakres:

- dodac session_note_saved/session_form -> sessions,
- dodac session_note_saved/post_session_note -> post_session_observations,
- dodac trainer_decision_saved/*,
- utrzymac zasade: jeden event, jedna tabela, jeden upsert,
- uruchamiac drain po online i po udanym bootstrapie Supabase,
- dopracowac statusy Synchronizuje, Zapisane w bazie, Blad synchronizacji,
- dodac manual QA dla refreshu, offline, retry i edycji przed sync.

Akceptacja:

- notatka, decyzja, zadanie i pomiar maja path local first, queue second, Supabase third,
- refresh w polowie synchronizacji nie gubi danych,
- event dodany podczas synchronizacji zostaje w kolejce,
- brak Reacta, brak zmiany designu, brak zmiany read layer, brak usuniecia fallbacku localStorage.

## 14. Przyszla optymalizacja po V1

Po V1 mozna rozwazyc scalanie eventow dotyczacych tego samego target_table i remote_id, np. session_note_saved/session_form oraz trainer_decision_saved/session_decision w jeden upsert sessions.

To nie jest V1. W pierwszej implementacji wazniejsza jest czytelnosc, idempotencja i prosty debug: jeden event, jedna tabela, jeden upsert.

## 15. Kryterium sukcesu

Po wdrozeniu wedlug tego kontraktu Studio Las OS ma pierwszy write layer, ktory:

- nie ryzykuje utraty danych przy offline, refreshu ani bledzie Supabase,
- zapisuje najwazniejsze jednostki procesu 1:1 zamiast fitness trackerowych setow,
- jednoznacznie rozdziela auth_user_id, trainer_profile_id i client_id,
- uzywa trwalego _sync.remote_id do idempotencji,
- zachowuje obecny sposob dzialania aplikacji,
- pozwala stopniowo przechodzic z lokalnego JSON do Supabase,
- nie rozwala prywatnego charakteru Studio Las OS.
