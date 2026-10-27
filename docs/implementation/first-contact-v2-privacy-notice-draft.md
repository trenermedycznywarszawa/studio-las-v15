# Informacja o prywatności — pierwszy kontakt ze Studio Las

**PROJEKT DO UZUPEŁNIENIA I AKCEPTACJI. NIE PUBLIKOWAĆ. 27.10.2026.**

Dotyczy przygotowywanego formularza v2 bez pola wiadomości. Nie obejmuje całej usługi, ankiety zdrowotnej ani panelu klienta. Nawiasy kwadratowe oznaczają brak decyzji lub potwierdzenia; nie mogą pozostać w opublikowanym tekście. Akceptacja projektu formularza nie jest akceptacją tej informacji.

## Proponowany tekst dla osoby korzystającej z formularza

### Kto odpowiada za dane i jak się skontaktować

Administratorem Twoich danych jest **[pełna nazwa lub imię i nazwisko administratora, adres]**. W sprawach danych osobowych skontaktuj się przez **[zatwierdzony adres kontaktowy]**. **[Potwierdzić, czy wyznaczono IOD; jeżeli tak, podać kontakt.]**

### Jakie dane i w jakim celu

Formularz służy do obsługi Twojej prośby o kontakt i ustalenia z trenerem kolejnego kroku. Podajesz imię oraz wybrany kanał odpowiedzi: telefon, SMS albo e-mail. Przy rozmowie telefonicznej wskazujesz dogodną porę. Możesz zaznaczyć ogólne cele lub pozostawić je puste. Szczegóły omówisz bezpośrednio z trenerem. Nie wpisuj informacji o zdrowiu, diagnoz ani dokumentacji medycznej, także w polu proponowanej pory rozmowy.

Zapisujemy zgłoszenie, czas jego otrzymania, wybraną formę kontaktu, wersje formularza i informacji o prywatności oraz techniczny identyfikator zgłoszenia. Trener może następnie zapisać stan obsługi i własną decyzję o dalszym kroku. Samo wysłanie formularza nie rezerwuje wizyty ani nie powoduje automatycznej kwalifikacji.

Podanie danych jest dobrowolne. Bez imienia i danych wybranego kanału nie można wysłać formularza. Wybór celów jest opcjonalny. **[Potwierdzić alternatywne sposoby kontaktu i właściwe informacje dla tych kanałów.]**

Podstawa prawna obsługi zapytania: **[właściwa podstawa z art. 6 ust. 1 RODO oraz odpowiadający jej cel; zatwierdza administrator po ocenie prawnej]**. Podstawa zabezpieczenia usługi przed nadużyciami: **[uzupełnić osobno; jeżeli prawnie uzasadniony interes, opisać ten interes]**. Potwierdzenie prośby o kontakt nie oznacza zgody marketingowej ani zgody na przetwarzanie danych dotyczących zdrowia.

### Gdzie trafia zgłoszenie

Treść formularza jest przesyłana do Supabase i zapisywana w bazie Studio Las. W badanym środowisku region bazy to EU West (Irlandia). Dostęp do zgłoszenia w panelu jest ograniczony do przypisanego trenera i wymaga dodatkowego uwierzytelnienia. Dostawcy infrastruktury mogą przetwarzać dane techniczne niezbędne do świadczenia usług.

Stronę udostępnia GitHub Pages. Fonty pobierane są z Google Fonts. Żądania do tych usług oraz Supabase przekazują dane techniczne połączenia, w tym adres IP. Zabezpieczenie antyspamowe formularza korzysta z pseudonimowego skrótu HMAC adresu sieciowego i liczników żądań. Skrót nie jest deklarowany jako anonimowy. Dane techniczne mogą też występować w logach dostawców.

Po zapisie nowego zgłoszenia produkcyjny serwer wysyła przez Formspree stałe powiadomienie dla trenera. Powiadomienie nie zawiera Twojego imienia, telefonu, e-maila, celów ani treści zgłoszenia. Nie oznacza to, że dostawca powiadomień nie przetwarza żadnych danych: obsługuje metadane połączenia serwera i dane odbiorcy powiadomienia.

**[Uzupełnić pełne podmioty, role, umowy powierzenia, upoważnione osoby, operatora panelu trenera oraz dostawców telefonu/SMS/poczty używanych do odpowiedzi. Potwierdzić ewentualne przekazania poza EOG, podstawy i sposób uzyskania kopii zabezpieczeń. Region bazy sam nie przesądza o wszystkich transferach.]**

### Jak długo

Zgłoszenia przechowujemy przez **[zatwierdzony okres lub konkretne kryteria ustalenia okresu, oddzielnie dla kontaktu bez dalszej współpracy i rozpoczęcia współpracy]**. Dane techniczne i logi: **[okresy i kryteria dla poszczególnych systemów]**. Kopie bezpieczeństwa: **[okres rotacji, dostęp i postępowanie po odtworzeniu danych objętych żądaniem usunięcia]**.

**[Nie publikować obietnicy automatycznego usuwania, dopóki mechanizm i terminy nie są wdrożone oraz sprawdzone.]**

### Twoje prawa

Możesz zwrócić się do administratora o dostęp do danych, ich sprostowanie, usunięcie lub ograniczenie przetwarzania, na warunkach określonych w RODO. Zależnie od zatwierdzonej podstawy i sposobu przetwarzania mogą przysługiwać również sprzeciw i przenoszenie danych. Jeżeli przetwarzanie opiera się na zgodzie, można ją wycofać bez wpływu na zgodność wcześniejszego przetwarzania. **[Dostosować tę część do wybranych podstaw, zamiast publikować nierozstrzygnięte warianty.]** Masz prawo złożyć skargę do Prezesa Urzędu Ochrony Danych Osobowych.

Formularz nie podejmuje automatycznych decyzji o przyjęciu do Studio Las ani nie wykorzystuje AI do oceny zgłoszenia. Kolejny krok ustala trener.

### Pamięć przeglądarki

Formularz przechowuje w `sessionStorage` techniczny identyfikator próby wysłania, aby ograniczać duplikaty po ponowieniu. Po potwierdzonym przyjęciu usuwa go. Kod formularza nie zapisuje tam treści zgłoszenia. **[Potwierdzić klasyfikację prawną i końcowe brzmienie informacji o pamięci urządzenia.]**

## Proponowana krótka informacja przy formularzu

„Podane dane wykorzystamy do obsługi Twojej prośby o kontakt w wybrany sposób. Cele są opcjonalne. Nie przesyłaj informacji o zdrowiu ani dokumentacji. Szczegóły: [Informacja o prywatności — zatwierdzony URL].”

Proponowane potwierdzenie: „Proszę o kontakt w sprawie Studio Las w wybrany przeze mnie sposób.” To propozycja do oceny; nie zmieniono istniejącego identyfikatora prawnego w bazie ani publicznej klauzuli.

## Warunki akceptacji

Administrator musi uzupełnić tożsamość, kontakt, podstawy, retencję i odbiorców, potwierdzić rzeczywiste przepływy oraz wersję tekstu i publiczny URL. Po akceptacji należy zsynchronizować tekst przy formularzu, pełną informację oraz whitelistę wersji w Edge i RPC. Obecne `first-contact-consent-v1` nie jest dowodem akceptacji niniejszego projektu.

Źródła do oceny: [RODO, w szczególności art. 5, 6, 9 i 13](https://eur-lex.europa.eu/eli/reg/2016/679/oj?locale=pl), [UODO o retencji i obowiązku informacyjnym](https://uodo.gov.pl/pl/676/4260). Treść oparto również na przeglądzie kodu formularza i Edge; umów, retencji logów dostawców ani pełnego procesu obsługi nie potwierdzono.
