# Studio Las OS 1.0 — stan wydania, 27.11.2026

**IN PROGRESS.** Zakres 1.0 obejmuje dostęp trenera i klienta, kontakt i zaproszenie, ankietę i PWD, kartę klienta, prowadzenie i historię treningu, postępy oraz oba panele. Kryterium odbioru to pełny przebieg na syntetycznych danych, z utrwaleniem po ponownym logowaniu, kontrolą uprawnień i sprawdzeniem widoku na telefonie.

## Wersje i środowiska

| Środowisko | Zweryfikowany stan |
| --- | --- |
| GitHub | Domyślny `main` był na `5c2dd6e`. Gałąź wydaniowa OS `codex/production-home-cleanup-20260929` była na `eaf8b33`. Poprawka statusu dostępu powstała na `codex/fix-client-access-status`, od tej gałęzi wydaniowej. |
| [Netlify — Studio Las OS](https://app.netlify.com/projects/studio-las-os/deploys/6af70bd740e786349941fcda) | Produkcyjny manifest wskazuje czysty artefakt z `be4f298` (Etap 01A). Anonimowe żądanie HTTP zwróciło 200. |
| Produkcyjna baza Supabase | Odczyt katalogu potwierdził brak migracji oraz funkcji i triggera Etapu 01B. Wiersz szablonu pre-PWD miał `active=true`. |
| Izolowane Supabase QA | Odczyt katalogu potwierdził funkcję i aktywny trigger 01B. Szablon pre-PWD miał `active=false`. Projekt zawiera wcześniejsze dane testowe. |
| Pozostały hosting | Współdzielony Supabase staging jest nieaktywny. Preview `studio-las-v18-preview` publikuje witrynę marketingową. Netlify PR105 nie jest aktualnym środowiskiem odbiorowym OS. |

Dostęp odczytowy do Netlify i obu aktywnych baz oraz uprawnienie zapisu w repozytorium potwierdzone. Źródło dotychczasowych dowodów operacyjnych i UAT to [zadanie #114](https://github.com/trenermedycznywarszawa/studio-las-v15/issues/114). Narzędzia izolowanego QA znajdują się w [draft PR #115](https://github.com/trenermedycznywarszawa/studio-las-v15/pull/115), na którym przeszły cztery lokalne testy blokad i podglądu. Wersja wydaniowa już zawiera blokadę uruchamiania starego workflow na współdzielonym stagingu.

## Kryteria produktu

| Obszar | Stan | Dowód i brakująca weryfikacja |
| --- | --- | --- |
| Logowanie, odzyskiwanie, role | PARTIAL | W #114 zapisano QA PASS dla logowań, MFA oraz testu Auth/REST. Lokalne regresje odzyskiwania przechodzą. Potrzebny przebieg na finalnym kandydacie. |
| Pierwszy kontakt, kwalifikacja, klient, zaproszenie | PARTIAL | W #114 udokumentowano kontakt, kwalifikację, konwersję i aktywację istniejącego konta w QA. Zaproszenie nowego konta z odbiorem e-maila i rejestracją pozostaje UNVERIFIED. |
| Ankieta, historia, PWD, pierwsza wskazówka | PARTIAL | W #114 udokumentowano przebieg funkcjonalny w QA. Produkcyjny 01B jest MISSING. Dla finalnego kandydata otwarte pozostają dowód pełnego przebiegu i powtarzalne odzyskanie po przerwaniu testu. |
| Karta klienta, kolejka, panel klienta, prowadzenie | PARTIAL | #114 dokumentuje kartę, portal i syntetyczny cykl informacji zwrotnej. Pełna kontrola historii treningów oraz widoków obu ról po ponownym logowaniu pozostaje UNVERIFIED. |
| Raport postępów | PARTIAL | #114 potwierdza zapis szkicu w QA. Treść tego szkicu odrzucono w odbiorze. Publikacja skorygowanego raportu i odczyt przez klienta pozostają UNVERIFIED. |

## Zmiana i dowód

Błąd z #114 w `tools/client-access-admin.js`: niedostępny lub błędny status nie włącza już zaproszenia ani cofnięcia dostępu. Ponowny udany odczyt przywraca właściwe akcje. Regresja obejmuje odmowę, błąd odświeżenia po aktywnym dostępie, brak konta, niedostępnego klienta i nieoczekiwaną odpowiedź. Test Chromium używa odpowiedzi syntetycznych, a wszystkie żądania poza localhost przechwytuje lokalnie. Przechodzą również trzy istniejące scenariusze sesji.

## Wznowienie

1. Najpierw przygotować wspólny kandydat aplikacji i migracji 01B w izolowanym QA. `git fetch origin && git fetch origin pull/115/head` pobiera istniejące narzędzia QA. Dla kandydata sprawdzić zgodność z gałęzią poprawki i uruchomić `node scripts/test_first_guidance_gate.mjs` oraz istniejące testy trybu QA z #115.
2. Najważniejszy test odbiorczy to zaproszenie dla **nowej** syntetycznej tożsamości, rejestracja i droga Kontakt → PWD → pierwsza wskazówka, z pozytywnym przebiegiem i odmową po decyzji odraczającej. Zachować dotychczasowe dane QA i bramkę E2E. Odtworzenie po przerwaniu testu w udokumentowanym, czystym celu jest nadal otwarte.
3. Przed wydaniem potwierdzić stan kwalifikowanego przeglądu prywatności dla pre-PWD, procedurę odzyskania oraz kolejność wydania migracji i aplikacji. Wymagana jest osobna zgoda na produkcję po testach odbiorczych.

PR #102 (kontakt v2) i #94 (dodatkowe powiadomienie) nie są wymagane do sprawdzenia istniejącej ścieżki v1. #101 zachowuje kontekst diagnostyki zaproszeń. #93, #95, #92, #90, #89, #88, #87, #86, #49, #36, #31, #30, #26 i #18 pozostają poza bieżącą integracją do czasu potwierdzenia konkretnej zależności odbiorowej.
