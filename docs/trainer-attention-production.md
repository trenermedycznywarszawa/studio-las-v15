# Kolejka uwagi trenera — wydanie produkcyjne

Zakres: PR #96, podstawa produkcyjna dd2644c (PR #93). Z PR #92 przeniesiono moduły odczytu/modelu i testy, z PR #95 wzorzec interakcji. Nie scalono eksperymentalnego renderera ani fikcyjnych danych.

## Zachowanie

Po MFA panel trenera otwiera „Uwaga trenera” bez parametrów URL. Rutynowy check-in, brak danych i cisza nie tworzą spraw. Jawne `contact_requested=true`, istniejąca reguła sygnału, otwarty kontakt lub świadomie zapisany termin przeglądu mogą utworzyć sprawę. Historycznych odpowiedzi bez znacznika nie interpretujemy jako prośby.

Przegląd i kontakt zapisują się w istniejącym `trainer_signal_reviews`. Otwarcie karty niczego nie zamyka. Tożsamość sygnału zawiera źródło i rewizję. Zmienione źródło otwartego kontaktu wymaga potwierdzenia kontekstu; zakończenie starego kontaktu nie przegląda automatycznie nowszej wersji. Historia znajduje się w karcie klienta, w sekcji sygnałów.

## Kontrakt zapisu i bezpieczeństwo

Migracja `20261002195748_trainer_attention_contact_intent.sql` dodaje pięcioargumentowe RPC. Stare cztery argumenty delegują z `false`. Własność klienta, aktualność publikacji, blokady, niezmienność odpowiedzi i identyfikator ponowienia pozostają zachowane. Zapis i projekcja klienta używają Europe/Warsaw. Nie zmieniono RLS ani wymogu AAL2 dla trenera. Prywatna historia nie jest częścią projekcji klienta.

Limit jednej odpowiedzi na działanie dziennie dotyczy wyłącznie check-inu. Osobny przycisk pytania pozostaje dostępny przed i po odpowiedzi. Pytania są niezależnymi, niezmiennymi zdarzeniami `client_contact_request` z autorem, czasem i odniesieniem do działania. Każde świadome wysłanie otrzymuje nowy UUID; ponowienie tej samej próby zachowuje UUID. Starsze odpowiedzi z `contact_requested=true` nadal tworzą te same sygnały. Nie dodano wiadomości, e-maili ani push. Nie dodano zależności aplikacji.

## Weryfikacja

Przeszły cztery wymagane regresje (PWD, decision-state integrity, stage2 69/69, rejestracja Pre-PWD v3.1). Błędy wcześniejszej gałęzi nie występowały na aktualnej podstawie produkcyjnej. Definicji ankiety ani oczekiwanego hashu nie zmieniono: `1816ef8dc6b4bced1f5c753a350f28d2e43cb361bab56691c378245c198233a6`.

CI `trainer-attention-production.yml` sprawdza rzeczywiste zapisy staging oraz widoki 1440px i 390px: pusty stan, rutynową odpowiedź, jawną prośbę, otwarcie kontekstu, przegląd, kontakt, relogowanie, historię, nową wersję źródła, izolację oraz awarię odczytu. Osobny test sprawdza anon/AAL1/AAL2, sześć źródeł, paginację i parytet sygnałów. Testy SQL odpowiedzi klienta i kontaktów wykonano transakcyjnie z rollback na stagingu.

Pierwszy pełny przebieg: https://github.com/trenermedycznywarszawa/studio-las-v15/actions/runs/37059837167

Konta `attention.trainer@example.test` i `attention.client@example.test` istnieją wyłącznie w staging `ulauyoqjoetjqktegeuq`, na izolowanym kliencie c7200000-0000-4000-8000-000000000001. Losowe hasła znajdują się w sekretach Actions `STUDIO_LAS_ATTENTION_QA_PASSWORD` i `STUDIO_LAS_ATTENTION_CLIENT_PASSWORD`; kod nie zawiera haseł. Tymczasowy czynnik MFA jest usuwany w kroku always. Syntetyczna historia zostaje w izolowanym stagingu dla audytu testów.

## Wydanie i wycofanie

Produkcja to projekt Netlify be1d8997-0857-48ab-b3a1-d9f681e2678a oraz Supabase ufcumhbnuyernuwepcij. Najpierw migracja bazy, potem allowlistowany statyczny artefakt z czystego commita. Manifest zawiera SHA źródła i hashe plików. Poprzedni deploy 6abc1fdae336555b19a26e42 pozwala wycofać frontend; migracja pozostaje kompatybilna ze starym frontendem. Nie cofamy zapisanych decyzji ani odpowiedzi klientów.


## Niezależne pytania — poprawka po PR #96

Migracja `20261003181509_client_contact_requests.sql` rozszerza dozwolone rodzaje zdarzeń i ochronę niezmienności. Nie usuwa ani nie zmienia indeksów dziennych odpowiedzi. Nowe RPC `save_client_contact_request` ustala klienta i autora z sesji; wymaga własnej aktualnej opublikowanej wskazówki. Dokładne ponowienie wcześniej zapisanego pytania działa również po wycofaniu wskazówki, lecz wymaga nadal aktywnego dostępu klienta. UUID użyty z inną treścią lub operacją jest odrzucany.

`client_contact_requests()` i pole `contactRequests` projekcji pokazują wyłącznie własne pytania zalogowanej osoby. Nie zawierają historii ani notatek trenera. Stan szkicu i próby zapisu jest tylko w pamięci strony. Po utracie odpowiedzi serwera odczyt potwierdzenia lub ten sam UUID zapobiega duplikatowi. Ręczne odświeżenie strony usuwa niezapisany szkic; zapisane pytania pozostają w projekcji.

Filtry kolejki i karty klienta obejmują stare check-iny i nowe pytania. Osobne uzupełnienia oraz ręczne raporty akceptują nowy rodzaj oryginalnego źródła, z zachowaniem uprawnień i zatwierdzania publikacji. Starszy frontend nadal może zapisywać check-in, ale nie odczyta nowego rodzaju zdarzenia; po przyjęciu nowych pytań ewentualny rollback musi zachować rozszerzony filtr kolejki.

Test `client_contact_requests.sql` działa na fikcyjnych danych w transakcji z rollback. `e2e_client_contact_requests.mjs` obejmuje pytanie bez check-inu i po nim, utratę potwierdzenia po rzeczywistym zapisie, równoległe ponowienia, kolejne pytanie po zamknięciu kontaktu, oryginalną odpowiedź, relogowanie, historię, prywatność i oba rozmiary ekranu. Poprzedni test kolejki zachowuje test starego pięcioargumentowego zapisu.
