# PR #102 — kopia i odzyskanie przed zmianą produkcji

Status 27.10.2026: **NIEWYKONANE / NO-GO**. Produkcja `ufcumhbnuyernuwepcij`, PostgreSQL 17.6.1.155. Odczyt agregatów: 19 klientów, 5 zgłoszeń, 5 profili, 53 migracje. To nie jest kopia ani dowód kompletności.

## Rozpoznanie

- Dostępne: Supabase CLI 2.101.0, pg_dump/pg_restore/psql 17.10, Docker executable. Nie potwierdzono działania silnika Docker ani izolowanego środowiska odtworzenia.
- `V:\StudioLasBackup` nie istnieje w dostępnej sesji; nie ma zamontowanego dysku V. Nie można zweryfikować daty, zawartości, sum kontrolnych ani odtworzyć wcześniejszej kopii. To nie dowodzi, że kopii nigdzie nie ma.
- Brak zmiennych procesu z połączeniem produkcyjnym i hasłem do lokalnego odtworzenia. Konektor SQL nie jest kanałem eksportu danych klientów.
- Lokalny checkout zawiera wcześniejsze `scripts/backup_and_verify_target.ps1` i `scripts/run_studio_las_backup_once.ps1`. Drugi wskazuje dawny worktree i może usuwać lokalną bazę testową: **nie uruchomiono go**. Sam skrypt ani jego stara deklaracja `restoreVerified` nie zamykają bramki.

## Ważne: wcześniejszy zaszyfrowany wolumin (wskazówka do sprawdzenia, NIE dowód aktualnego backupu)

W poprzednich pracach operator używał kontenera **VeraCrypt** pod ścieżką lokalną `C:\\StudioLasSecure\\studio-las-backup.hc`, montowanego jako dysk `V:`. Zapis z 21.07.2026 odnosił się do `V:\\StudioLasBackup\\20260721T172308Z`; wcześniejsza walidacja odtworzenia Supabase miała ograniczenia związane z rozszerzeniem `supabase_vault`. Brak `V:` w aktualnej sesji może oznaczać **niezamontowany wolumin**, a nie brak samego kontenera.

Operator lokalny: **najpierw sprawdzić obecność kontenera bez jego edycji; montować wyłącznie przez VeraCrypt, hasło wpisać bezpośrednio w aplikacji lokalnie (nigdy w czacie ani logach).** Nie wnioskować z samego istnienia plików, że obejmują obecną produkcję: od lipca były kolejne migracje i zapisy. Kopia aktualna wymaga nowego dumpa i skutecznego, izolowanego odtworzenia. Nie uruchamiać starych skryptów bez audytu ścieżek i destrukcyjnych komend.

## Bezpieczna procedura do wykonania po udostępnieniu zasobów

1. Właściciel wskazuje istniejący, zatwierdzony zaszyfrowany wolumin poza repo i synchronizacją chmurową. Sprawdzić montowanie, szyfrowanie oraz ACL ograniczone do operatora/SYSTEM, wolne miejsce i wykluczenie z indeksowania. Nie tworzyć zastępczego katalogu z danymi w repo.
2. Najpierw zinwentaryzować nazwy, daty, rozmiary i manifesty istniejących kopii; nie czytać ich zawartości przez narzędzia AI. Porównać SHA-256 z manifestem lokalnie, zwracając wyłącznie zgodność i liczniki. Zachować oryginały bez nadpisywania.
3. Wczytać dane połączenia z menedżera haseł w procesie operatora. Nie umieszczać hasła w argumentach poleceń, URI w historii, logach lub czacie. Użyć bezpiecznego lokalnego pliku usług/hasła PostgreSQL albo ograniczonego środowiska procesu. Zweryfikować docelowy host/ref, SSL i tożsamość bazy.
4. Przed użyciem CLI sprawdzić `supabase --help`, `supabase db --help`, `supabase db dump --help` i `pg_dump --help`. Nowa kopia ma własny katalog UTC + losowy identyfikator; istniejący katalog powoduje odmowę. Logi techniczne pozostają na chronionym woluminie i nie mogą zawierać danych wierszy ani sekretów.
5. Wykonać spójny logiczny dump ról bez haseł, schematu i danych według aktualnej procedury Supabase. Przy osobnych plikach zapewnić wspólny snapshot lub kontrolowane okno bez zapisów; nie ogłaszać trzech niezależnych dumpów atomową kopią. Uwzględnić `public`, `private`, wymagane Auth, historię migracji, funkcje, RLS i granty. Udokumentować pomijane schematy dostawcy. Klucze Edge, konfigurację Auth i pliki Storage zabezpieczyć osobno: dump DB nie obejmuje całej infrastruktury.
6. Manifest zawiera datę, ref, wersje narzędzi, zakres, SHA-256 i rozmiary, bez kontaktów klientów. Traktować dump jako dane wrażliwe nawet po pseudonimizacji identyfikatorów.
7. Odtworzenie wykonać wyłącznie w zatwierdzonym, izolowanym środowisku z chronionym dyskiem i zablokowanym ruchem wychodzącym, webhookami, cronem oraz powiadomieniami. Nie używać współdzielonego stagingu i nie tworzyć nowego projektu Supabase. Utworzenie/wyczyszczenie środowiska wymaga osobnej zgody zgodnie z zakresem tego zadania.
8. Odtwarzać z zatrzymaniem przy pierwszym błędzie; sprawdzić schemat, role, funkcje, grants/RLS, migracje, liczby wierszy i więzy referencyjne. Porównać kontrolne skróty danych lokalnie, bez wypisywania treści. Przetestować dostęp i odmowy na syntetycznych kontach. Dopiero udany restore oraz ponowna zgodność SHA-256 zamykają bramkę.
9. Zmierzyć czas odtworzenia, zapisać operatora i wynik, ustalić RPO/RTO oraz postępowanie ze zgłoszeniami nadesłanymi po kopii. Nie usuwać starej kopii ani środowiska bez właściwej zgody.

Nie wykonano nowego dumpa, odtworzenia ani zmian produkcyjnych. Nie deklarować backup PASS.

Źródła: [Supabase Database Backups](https://supabase.com/docs/guides/platform/backups), [CLI backup and restore](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore). Free wymaga własnej zweryfikowanej ścieżki kopii; sam ACTIVE_HEALTHY nie jest zabezpieczeniem danych.
