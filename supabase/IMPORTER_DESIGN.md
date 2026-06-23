# Studio Las OS 9.0 - Importer Design

This document describes the future localStorage -> Supabase importer.

It is a design document only. No JavaScript importer, frontend connection, login flow, or production data migration is implemented in this phase.

Phase 1 schema runtime validation has passed in a real empty Supabase test project. The validated stack was:

1. `migrations/001_initial_schema.sql`
2. `migrations/002_rls_policies.sql`
3. `migrations/003_client_safe_views.sql`
4. `dev/seed_test_data.sql`
5. `tests/rls_access_tests.sql`

Final result:

`Studio Las OS 9.0 RLS access tests completed`

## 1. Cel importera

Importer ma przeniesc dane Studio Las OS 8.0 z localStorage do schematu Supabase OS 9.0 bez utraty funkcji i bez zmiany dzialania aktualnego frontendu.

Importer ma byc narzedziem migracyjnym/admin-only, uruchamianym poza aplikacja klienta. Pierwsza wersja nie jest funkcja UI.

Cele:

- zachowac komplet danych z `studioLasOS_v3`,
- zachowac powiazanie z rekordami legacy przez `legacy_id`,
- zapisac kazdy import w `legacy_import_batches`,
- zapisac kazdy zaimportowany, pominiety albo niejednoznaczny rekord w `legacy_import_records`,
- wykryc rekordy `needs_review`,
- nie tworzyc bezposredniego dostepu klienta do danych wrazliwych,
- przygotowac dane dla przyszlego panelu klienta przez client-safe views.

## 2. Dane wejsciowe

Podstawowym wejsciem jest pelny eksport JSON z localStorage:

- `studioLasOS_v3`

Dodatkowe zrodla, jesli sa dostepne:

- `studioLasExerciseLibraryV1`
- `studioLasGuidance_v1`
- `studioLasGuidancePilot_v1`

Importer powinien przyjmowac:

- plik JSON backupu,
- `trainer_id` profilu trenera docelowego,
- `source_app_version`, np. `OS 8.0`,
- tryb `dry_run` / `apply`,
- opcjonalny prefix Storage dla dokumentow.

Przed kazdym importem nalezy zapisac nienaruszony backup JSON w Storage albo w bezpiecznym miejscu poza baza.

## 3. Mapowanie danych

### clients

Zrodlo: `studioLasOS_v3.clients[]`

Mapowanie:

- `client.id` -> `clients.legacy_id`
- `client.name` -> `clients.name`
- `client.contact` -> `clients.contact`
- `client.email` -> `clients.email`
- `client.phone` -> `clients.phone`
- `client.package` -> `clients.package`
- `client.stage` -> `clients.stage`
- `client.stageRaw` -> `clients.stage_raw`
- `client.startDate` -> `clients.start_date`
- `client.nextSessionDate` -> `clients.next_session_date`
- `client.nextReviewDate` -> `clients.next_review_date`
- `client.goal` -> `clients.goal`
- `client.motivation` -> `clients.motivation`
- `client.fears` -> `clients.fears`
- `client.healthStatus` -> `clients.health_status`
- `client.contraindications` -> `clients.contraindications`
- `client.redFlagsText` -> `clients.red_flags_text`
- `client.communicationProfile` -> `clients.communication_profile`
- `client.nextMilestone` -> `clients.next_milestone`
- `client.workingHypothesis` -> `clients.working_hypothesis`
- importer input `trainer_id` -> `clients.owner_trainer_id`

Uwagi:

- `stage` musi przejsc walidacje `1..4`; wartosci niepewne ida do `stage_raw` i `legacy_import_records.status = 'needs_review'`.
- `clients.status` domyslnie `active`.
- Importer nie tworzy kont klienta w Auth w pierwszej wersji.

### sessions

Zrodlo: `client.sessions[]`

Mapowanie:

- `session.id` -> `sessions.legacy_id`
- parent client -> `sessions.client_id`
- `session.date` -> `sessions.date`
- `session.readiness` -> `sessions.readiness`
- `session.vasBefore` -> `sessions.vas_before`
- `session.vasAfter` -> `sessions.vas_after`
- `session.mobilityIndex` -> `sessions.mobility_index`
- `session.sleepQuality` -> `sessions.sleep_quality`
- `session.exercises` / `session.exercisesText` -> `sessions.exercises_text`
- `session.trainerObservation` -> `sessions.trainer_observation`
- `session.trainerDecision` -> `sessions.trainer_decision`
- `session.milestone` -> `sessions.milestone`
- `session.clientSummary` -> `sessions.client_summary`
- `session.clientNextStep` -> `sessions.client_next_step`
- explicit publish decision -> `sessions.client_visible`, `sessions.published_at`

Uwagi:

- Brak daty sesji to `needs_review`.
- Dane trenerskie pozostaja w tabeli bazowej, nie w widokach klienta.

### body_measurements

Zrodlo: `client.measurements[]`

Mapowanie:

- `measurement.id` -> `body_measurements.legacy_id`
- parent client -> `body_measurements.client_id`
- `measurement.date` / `measurement.measuredAt` -> `body_measurements.measured_at`
- `measurement.source` -> `body_measurements.source`
- `measurement.inputMethod` / `sourceMode` -> `body_measurements.input_method`
- `measurement.parseStatus` / `pdfAutoFilled` -> `body_measurements.parse_status`
- `measurement.weightKg` -> `body_measurements.weight_kg`
- `measurement.fatPercent` -> `body_measurements.fat_percent`
- `measurement.fatMassKg` -> `body_measurements.fat_mass_kg`
- `measurement.fatFreeMassKg` -> `body_measurements.fat_free_mass_kg`
- `measurement.muscleMassKg` -> `body_measurements.muscle_mass_kg`
- `measurement.bodyWaterPercent` -> `body_measurements.body_water_percent`
- `measurement.bodyWaterKg` -> `body_measurements.body_water_kg`
- `measurement.visceralFatRating` -> `body_measurements.visceral_fat_rating`
- `measurement.bmrKcal` -> `body_measurements.bmr_kcal`
- `measurement.metabolicAge` -> `body_measurements.metabolic_age`
- `measurement.bmi` -> `body_measurements.bmi`
- `measurement.boneMassKg` -> `body_measurements.bone_mass_kg`
- `measurement.proteinKg` -> `body_measurements.protein_kg`
- `measurement.trainerInterpretation` -> `body_measurements.trainer_interpretation`
- client-safe summary -> `body_measurements.client_summary`
- linked PDF document -> `body_measurements.document_id`
- publish decision -> `body_measurements.client_visible`, `body_measurements.published_at`

Uwagi:

- `pdfDataUrl` nigdy nie trafia bezposrednio do SQL.
- Nieparsowalne pola Tanity ida do `legacy_import_records.raw_payload`.

### training_load_observations

Zrodlo: `client.polarSessions[]`

Mapowanie:

- `polarSession.id` -> `training_load_observations.legacy_id`
- parent client -> `training_load_observations.client_id`
- matched session -> `training_load_observations.session_id`
- `polarSession.date` / `observedAt` -> `training_load_observations.observed_at`
- `polarSession.source` -> `training_load_observations.source`
- `polarSession.sessionType` -> `training_load_observations.session_type`
- `polarSession.durationMin` -> `training_load_observations.duration_min`
- `polarSession.avgHr` / `hrAvg` -> `training_load_observations.hr_avg`
- `polarSession.maxHr` / `hrMax` -> `training_load_observations.hr_max`
- `polarSession.zoneLightMin` -> `training_load_observations.zone_light_min`
- `polarSession.zoneModerateMin` -> `training_load_observations.zone_moderate_min`
- `polarSession.zoneHighMin` -> `training_load_observations.zone_high_min`
- `polarSession.rpe` -> `training_load_observations.rpe`
- `polarSession.trainerNote` -> `training_load_observations.trainer_note`
- client-safe summary -> `training_load_observations.client_summary`
- `polarSession.loadDecision` -> `training_load_observations.load_decision`
- publish decision -> `training_load_observations.client_visible`, `training_load_observations.published_at`

Uwagi:

- Polar nie dostaje glownych kolumn `vasBefore`, `vasAfter`, `readiness`, `sleepQuality`.
- Te pola sa obslugiwane osobno w sekcji "Legacy Polar fields".

### assessment_results

Zrodlo: `client.testResults[]`

Mapowanie:

- `testResult.id` -> `assessment_results.legacy_id`
- parent client -> `assessment_results.client_id`
- `testResult.testId` -> `assessment_results.test_id`
- `testResult.testName` -> `assessment_results.test_name`
- `testResult.date` / `performedAt` -> `assessment_results.performed_at`
- `testResult.side` -> `assessment_results.side`
- `testResult.resultText` -> `assessment_results.result_text`
- `testResult.painBefore` -> `assessment_results.pain_before`
- `testResult.painAfter` -> `assessment_results.pain_after`
- `testResult.quality` -> `assessment_results.quality`
- `testResult.interpretation` -> `assessment_results.interpretation`
- `testResult.trainerDecision` -> `assessment_results.trainer_decision`
- `testResult.nextStep` -> `assessment_results.next_step`
- `testResult.trainerNote` -> `assessment_results.trainer_note`
- client-safe summary -> `assessment_results.client_summary`
- publish decision -> `assessment_results.client_visible`, `assessment_results.published_at`

Uwagi:

- Wartosci poza check constraints ida do `needs_review`.

### home_plans

Zrodlo: `client.homePlan`

Mapowanie:

- `homePlan.id` -> `home_plans.legacy_id`
- parent client -> `home_plans.client_id`
- `homePlan.title` -> `home_plans.title`
- `homePlan.focus` -> `home_plans.focus`
- `homePlan.frequency` -> `home_plans.frequency`
- `homePlan.duration` -> `home_plans.duration`
- `homePlan.instructions` -> `home_plans.instructions`
- publish decision -> `home_plans.status`, `home_plans.published_at`

Uwagi:

- Pierwsza wersja importera powinna tworzyc maksymalnie jeden aktywny plan na klienta.
- Drafty albo archiwalne plany moga byc importowane jako `draft`/`archived`, jesli zrodlo daje taka informacje.

### home_plan_items

Zrodlo: `client.homePlan.exercises[]`

Mapowanie:

- `exercise.id` -> `home_plan_items.legacy_id`
- parent plan -> `home_plan_items.home_plan_id`
- parent client -> `home_plan_items.client_id`
- matched exercise library row -> `home_plan_items.exercise_id`
- `exercise.name` -> `home_plan_items.name`
- `exercise.category` -> `home_plan_items.category`
- `exercise.region` -> `home_plan_items.region`
- `exercise.dosage` -> `home_plan_items.dosage`
- `exercise.frequency` -> `home_plan_items.frequency`
- `exercise.clientCue` -> `home_plan_items.client_cue`
- `exercise.stopCriteria` -> `home_plan_items.stop_criteria`
- `exercise.videoUrl` -> `home_plan_items.video_url`
- `exercise.sortOrder` -> `home_plan_items.sort_order`
- `exercise.addedAt` -> `home_plan_items.added_at`
- trainer-only note -> `home_plan_items.trainer_note`
- publish decision -> `home_plan_items.status`, `home_plan_items.published_at`

Uwagi:

- Jesli cwiczenie nie pasuje do atlasu, importer moze zapisac `exercise_id = null` i zachowac nazwe oraz instrukcje na itemie.

### guidance_events

Zrodlo: `studioLasGuidance_v1` oraz przyszle mapowanie check-inow/daily steps.

Mapowanie:

- source id -> `guidance_events.legacy_id` nie istnieje w tabeli, wiec source id trafia do `legacy_import_records.legacy_id`
- client -> `guidance_events.client_id`
- matched home plan item -> `guidance_events.home_plan_item_id`
- date -> `guidance_events.event_date`
- kind -> `guidance_events.kind`
- completed -> `guidance_events.completed`
- remaining details -> `guidance_events.payload`
- actor profile -> `guidance_events.created_by`

Uwagi:

- Tabela nie ma `legacy_id`; kazdy event musi miec `legacy_import_records.source_path` i `target_id`.
- `client.checkins[]` bez stabilnego kontraktu ida do `needs_review`, chyba ze da sie je bezpiecznie sklasyfikowac.

### guidance_pilots

Zrodlo: `studioLasGuidancePilot_v1`

Mapowanie:

- source id -> `legacy_import_records.legacy_id`
- client -> `guidance_pilots.client_id`
- `status` -> `guidance_pilots.status`
- `startDate` -> `guidance_pilots.start_date`
- `durationWeeks` -> `guidance_pilots.duration_weeks`
- `currentWeek` -> `guidance_pilots.current_week`
- `objective` -> `guidance_pilots.objective`
- trainer-only note -> `guidance_pilots.trainer_note`

Feedback tygodniowy:

- week -> `guidance_pilot_feedback.week`
- `understoodNextStep` -> `guidance_pilot_feedback.understood_next_step`
- `reducedChaos` -> `guidance_pilot_feedback.reduced_chaos`
- `friction` -> `guidance_pilot_feedback.friction`
- `simplifyNext` -> `guidance_pilot_feedback.simplify_next`

### reports

Zrodlo: `client.reports[]`

Mapowanie:

- `report.id` -> `reports.legacy_id`
- parent client -> `reports.client_id`
- `report.type` -> `reports.type`
- inferred or trainer-approved value -> `reports.audience`
- inferred or trainer-approved value -> `reports.status`
- `report.title` -> `reports.title`
- `report.content` -> `reports.content`
- publish decision -> `reports.published_at`
- importing trainer -> `reports.created_by`

Uwagi:

- OS 8.0 nie ma pewnego pola `audience`; importer nie powinien automatycznie publikowac raportu klientowi bez reguly zatwierdzonej przez trenera.
- Domyslnie niepewne raporty ida jako `audience = 'trainer'`, `status = 'draft'` albo `needs_review`.

### client_documents

Zrodlo:

- `client.documents[]`
- Tanita `measurement.pdfDataUrl`
- przyszle zalaczniki raportow albo klienta

Mapowanie:

- parent client -> `client_documents.client_id`
- related table -> `client_documents.related_table`
- related row id -> `client_documents.related_id`
- kind -> `client_documents.kind`
- original filename -> `client_documents.original_name`
- Storage bucket -> `client_documents.storage_bucket`
- Storage path -> `client_documents.storage_path`
- MIME type -> `client_documents.mime_type`
- size -> `client_documents.size_bytes`
- visibility decision -> `client_documents.audience`
- publish decision -> `client_documents.status`, `client_documents.published_at`

Uwagi:

- Dokumenty sa trainer-only, chyba ze `audience = 'client'`, `status = 'published'`, `published_at is not null`.
- Pierwsza wersja importera nie powinna publikowac dokumentow klientowi automatycznie.

### legacy_import_batches

Jeden import = jeden batch.

Mapowanie:

- importing trainer -> `legacy_import_batches.trainer_id`
- OS version -> `legacy_import_batches.source_app_version`
- localStorage key -> `legacy_import_batches.storage_key`
- backup file path -> `legacy_import_batches.backup_json_path`
- expected counts -> `legacy_import_batches.record_counts`
- validation output -> `legacy_import_batches.validation_summary`
- import state -> `legacy_import_batches.status`

Statusy:

- `draft`
- `running`
- `completed`
- `failed`

### legacy_import_records

Kazdy rekord zrodlowy powinien miec wpis audytowy.

Mapowanie:

- batch -> `legacy_import_records.import_batch_id`
- imported client -> `legacy_import_records.client_id`
- localStorage path -> `legacy_import_records.source_path`
- source id -> `legacy_import_records.legacy_id`
- target table -> `legacy_import_records.target_table`
- target row id -> `legacy_import_records.target_id`
- original object snapshot -> `legacy_import_records.raw_payload`
- import status -> `legacy_import_records.status`
- notes -> `legacy_import_records.notes`

Statusy:

- `imported`
- `skipped`
- `needs_review`
- `error`

## 4. Strategia legacy_id

`legacy_id` jest glownym mostem miedzy OS 8.0 i OS 9.0.

Zasady:

- jesli obiekt ma `id`, zapisac go w `legacy_id`,
- jesli obiekt nie ma `id`, wygenerowac stabilny legacy key z `source_path`, np. `clients[2].sessions[4]`,
- zawsze zapisac `source_path` w `legacy_import_records`,
- nie nadpisywac `legacy_id` recznie po imporcie,
- dla tabel bez `legacy_id` uzywac `legacy_import_records.legacy_id` i `target_id`.

## 5. Strategia idempotencji

Importer musi byc mozliwy do ponownego uruchomienia na tym samym backupie.

Zasady:

- `clients`: upsert po `(owner_trainer_id, legacy_id)`,
- child records: upsert po `(client_id, legacy_id)`, jesli tabela ma `legacy_id`,
- tabele bez `legacy_id`: wykrywanie przez `legacy_import_records` albo naturalny klucz, np. daily guidance event,
- Storage: deterministyczna sciezka oparta o `client_id`, `legacy_id`, hash pliku i oryginalna nazwe,
- kazdy run tworzy osobny `legacy_import_batches`,
- rekordy juz istniejace powinny dostac nowy wpis audytowy `legacy_import_records`, ale nie duplikowac danych docelowych.

Konflikty:

- jesli docelowy rekord istnieje i rozni sie od backupu, importer nie powinien cicho nadpisywac danych edytowanych po migracji,
- w trybie `dry_run` importer raportuje konflikt,
- w trybie `apply` pierwsza wersja powinna preferowac `skip + needs_review`, nie automatyczne nadpisanie.

## 6. Obsluga needs_review

`needs_review` oznacza, ze dane sa zachowane, ale nie zostaly bezpiecznie przemapowane do modelu OS 9.0.

Przyklady:

- brak wymaganej daty,
- wartosc poza check constraint,
- niejednoznaczny `stage`,
- raport bez pewnego `audience`,
- Polar legacy fields bez pasujacej sesji,
- `client.checkins[]` bez stabilnego kontraktu,
- `client.documents[]` bez stabilnego kontraktu,
- uszkodzony albo nierozpoznany `pdfDataUrl`,
- plaintext `clientAccessCode`.

Zasada:

- nie tracic danych,
- zapisac oryginalny obiekt w `legacy_import_records.raw_payload`,
- ustawic `legacy_import_records.status = 'needs_review'`,
- dodac czytelne `notes`.

## 7. Tanita pdfDataUrl i Supabase Storage

OS 8.0 moze trzymac PDF Tanity jako `pdfDataUrl`.

Importer powinien:

1. Wykryc `measurement.pdfDataUrl`.
2. Zweryfikowac format `data:application/pdf;base64,...`.
3. Zdekodowac base64 poza SQL.
4. Obliczyc hash pliku.
5. Wyslac PDF do Supabase Storage.
6. Utworzyc `client_documents`:
   - `kind = 'tanita_pdf'`
   - `related_table = 'body_measurements'`
   - `storage_bucket`
   - `storage_path`
   - `original_name`
   - `mime_type = 'application/pdf'`
   - `size_bytes`
   - domyslnie `audience = 'trainer'`
   - domyslnie `status = 'draft'`
7. Podpiac `body_measurements.document_id`.
8. Nie zapisywac base64 w SQL.

Storage path powinien byc deterministyczny, np.:

`clients/{client_id}/tanita/{legacy_id_or_hash}.pdf`

## 8. Legacy Polar fields

Legacy pola Polar:

- `vasBefore`
- `vasAfter`
- `readiness`
- `sleepQuality`

Nie trafiaja jako glowne pola do `training_load_observations`.

Regula:

1. Znajdz sesje tego samego klienta z ta sama data.
2. Jesli jest dokladnie jedna bezpieczna sesja i pola sesji sa puste, zapisz:
   - `vasBefore` -> `sessions.vas_before`
   - `vasAfter` -> `sessions.vas_after`
   - `readiness` -> `sessions.readiness`
   - `sleepQuality` -> `sessions.sleep_quality`
3. Jesli nie ma sesji albo jest wiele pasujacych sesji, nie zgaduj.
4. Zapisz oryginalny Polar payload w `legacy_import_records.raw_payload`.
5. Oznacz rekord jako `needs_review`.

## 9. Walidacja po imporcie

Importer powinien porownac liczby zrodlowe i docelowe:

- clients,
- sessions,
- body measurements,
- training load observations,
- assessment results,
- reports,
- home plan items,
- guidance events,
- guidance pilots,
- guidance pilot feedback,
- client documents,
- needs_review,
- skipped,
- errors.

Walidacja powinna zapisac wynik w:

- `legacy_import_batches.record_counts`,
- `legacy_import_batches.validation_summary`.

Minimalne kontrole:

- liczba klientow zgodna,
- kazdy klient ma `legacy_import_records`,
- kazdy rekord child ma parent client,
- brak nieoczekiwanych duplikatow `legacy_id`,
- brak publikacji klientowi bez `published_at`,
- brak `pdfDataUrl` w SQL,
- brak Polar legacy fields jako kolumn w `training_load_observations`.

## 10. Plan rollbacku

Pierwsza wersja importera powinna wspierac rollback na poziomie batcha.

Strategia:

1. Importer tworzy `legacy_import_batches` jako `running`.
2. Kazdy target row zapisuje `legacy_import_records.target_table` i `target_id`.
3. Jesli import zawiedzie przed publikacja, batch dostaje `status = 'failed'`.
4. Rollback usuwa albo soft-delete'uje rekordy utworzone w tym batchu, w odwrotnej kolejnosc relacji.
5. Pliki Storage utworzone w batchu sa usuwane po sciezkach zapisanych w `client_documents`.

Bezpieczna kolejnosc rollbacku:

1. `guidance_events`
2. `guidance_pilot_feedback`
3. `guidance_pilots`
4. `home_plan_items`
5. `home_plans`
6. `assessment_results`
7. `training_load_observations`
8. `body_measurements`
9. `client_documents`
10. `sessions`
11. `client_intakes`
12. `client_users` / `client_trainers`, jesli importer je utworzyl
13. `clients`

W pierwszej wersji preferowany rollback to soft delete dla danych procesowych i usuniecie tylko rekordow stricte testowych w pustym projekcie.

## 11. Czego importer nie robi w pierwszej wersji

Pierwsza wersja nie powinna:

- podlaczac Supabase do frontendu,
- tworzyc logowania w UI,
- tworzyc kont klientow w Auth automatycznie,
- wysylac maili,
- publikowac danych klientowi bez reguly zatwierdzonej przez trenera,
- importowac plaintext `clientAccessCode` jako tekst,
- migrowac produkcyjnych danych bez backupu JSON,
- usuwac danych z localStorage,
- modyfikowac `studio-management-os-3.0.html`,
- przepisywac OS 8.0,
- automatycznie interpretowac niejednoznacznych danych medycznych,
- publikowac dokumentow klientowi bez jawnego statusu i `published_at`.

## 12. Kolejnosc przyszlej implementacji

Rekomendowana kolejnosc:

1. Przygotowac osobny importer admin-only poza frontendem.
2. Dodac tryb `dry_run`, ktory tylko czyta JSON i tworzy raport mapowania bez zapisu.
3. Dodac parser i walidator wejscia `studioLasOS_v3`.
4. Dodac tworzenie `legacy_import_batches`.
5. Dodac import `clients` i `client_intakes`.
6. Dodac import `sessions`.
7. Dodac import `body_measurements` bez PDF.
8. Dodac Storage flow dla Tanita `pdfDataUrl`.
9. Dodac import `training_load_observations` i reguly legacy Polar fields.
10. Dodac import `assessment_results`.
11. Dodac import `home_plans` i `home_plan_items`.
12. Dodac import `guidance_events`, `guidance_pilots`, `guidance_pilot_feedback`.
13. Dodac import `reports` jako draft/trainer-only, chyba ze zatwierdzono reguly publikacji.
14. Dodac import `client_documents`.
15. Dodac pelny zapis `legacy_import_records`.
16. Dodac walidacje rekordow po imporcie.
17. Dodac raport `needs_review`.
18. Dodac rollback batcha.
19. Uruchomic importer na fikcyjnym backupie.
20. Uruchomic importer na kopii testowej prawdziwego backupu.
21. Dopiero po zatwierdzeniu wynikow projektowac integracje frontendu.
