# Studio Las — pierwszy kontakt v2: protokół akceptacji prywatności

## Aktualizacja 27.10.2026 — nadal NOT APPROVED

Właściciel potwierdził brak zatwierdzonej polityki dla v2 i zlecił przygotowanie projektu. Projekt do uzupełnienia: [first-contact-v2-privacy-notice-draft.md](first-contact-v2-privacy-notice-draft.md). Nie opublikowano go jako obowiązującej klauzuli.

W aktualnym kandydacie usunięto pole `personWords` z UI (payload zawiera null), a Edge v8 na stagingu odrzuca niepustą wiadomość v2. V1 pozostaje obsługiwane. Historyczny opis pola poniżej dotyczy wcześniejszego HEAD. Pole niestandardowej pory nadal przyjmuje krótki tekst; redukcja danych nie gwarantuje braku incydentalnych informacji zdrowotnych. RPC service_role nadal ma parametr wiadomości dla zgodności; publiczny dostęp jest przez walidujący Edge, anon/authenticated nie mają EXECUTE.

Nie zmieniono samodzielnie podstaw prawnych, retencji ani identyfikatora `first-contact-consent-v1`. Publikacja wymaga wypełnienia i akceptacji projektu oraz spójnego wersjonowania frontend/Edge/RPC. Publiczna strona v1 podczas odczytu HTTP 200 nadal nie miała odnośnika do polityki prywatności.

**Data:** 2026-10-26  
**Status:** DRAFT / NOT APPROVED — NIE PUBLIKOWAĆ JAKO POLITYKI PRYWATNOŚCI.  
**Przedmiot:** publiczny formularz `ankieta-kontakt.html` z PR #102.

## Dowiedziony zakres (kod i testy)

Publiczny formularz wysyła do funkcji Supabase `public-inquiry-ingress` następujące pola:
- `name` — imię;
- `phone` albo `email` — jedno wymagane medium odpowiedzi, zgodne z `contactMethod` (telefon, SMS, e-mail);
- `preferredContactWindow` — wyłącznie jeżeli klient prosi o rozmowę;
- `broadGoals[]` — 0–6 opcjonalnych ogólnych celów: powrót do aktywności, siła/kondycja, masa ciała/sylwetka, pewność ruchu, utrzymanie sprawności, inny/nieokreślony;
- `personWords` — dobrowolna wiadomość tekstowa do 280 znaków, która MIMO instrukcji może zawierać dobrowolnie ujawnione informacje o zdrowiu;
- `contactConsent` (potwierdzenie prośby o kontakt), `formVersion`, `privacyNoticeVersion`, techniczny klucz idempotencji i pole antyspamowe.

Usługa Supabase realizuje zapis do `public.inquiries` z właścicielem-trenerem i limitem żądań. Powiadomienie do Formspree zawiera **tylko** stały tekst „Nowy pierwszy kontakt w Studio Las OS”, bez imienia, telefonu, e-maila i treści klienta. Publiczna strona ładuje Google Fonts.

## Otwarte decyzje do zatwierdzenia przez właściwą osobę

1. **Administrator danych:** potwierdzić jego pełne prawidłowe oznaczenie i aktualną drogę kontaktu z osobą, której dane dotyczą. Nie zakładać, że samo logo i e-mail wyczerpują obowiązek informacyjny.
2. **Cel i podstawy prawne:** odrębnie ocenić odpowiedź na zapytanie (art. 6 RODO) i postępowanie z dobrowolnie ujawnionymi danymi dotyczącymi zdrowia (art. 9 RODO). Nie przypisywać automatycznie „zgody” do każdej operacji. Czy otwarte pole jest potrzebne teraz i w tej postaci?
3. **Odbiorcy/podmioty przetwarzające:** zweryfikować rzeczywiste umowy i role: Supabase (baza/Edge), Formspree (wyłącznie powiadomienia bez treści kontaktu), GitHub Pages (hosting), Google Fonts. Sprawdzić ewentualne transfery poza EOG i zabezpieczenia.
4. **Retencja i uprawnienia osoby:** określić zatwierdzony czas przechowywania niezakwalifikowanych zgłoszeń, sposób cofnięcia zgody, sprostowania, dostępu, usunięcia oraz obsługi odmowy i incydentu. Nie wyznaczać terminu tylko dla wygody programisty.
5. **Kopia zasad prywatności:** wskazać *konkretny* zatwierdzony publiczny URL polityki/klauzuli dostosowanej do v2, który będzie umieszczony bezpośrednio pod formularzem; sprawdzić, czy strona rzeczywiście działa i czy tekst odpowiada realnemu przepływowi danych.
6. **Aktualność consent/version:** formularz v2 w PR ma zachowane obowiązkowe potwierdzenie v1 oraz identyfikator `first-contact-consent-v1`. Rozstrzygnąć, czy stanowi to właściwą prośbę o kontakt, czy wymaga zmiany treści / osobnej podstawy i nowego numeru wersji; spiąć z backendem.
7. **Dane szczególne:** nie zachęcać do przesyłania diagnoz, dokumentacji czy opisu choroby na publicznym formularzu. Jeżeli otwarte pole zostaje, ocenić legalność i ochronę incydentalnie wpisanych informacji zdrowotnych.

## Status decyzji

- **ZATWIERDZONO:** brak udokumentowanego zatwierdzenia, nie należy niczego dopowiadać.
- **WYMAGANE PRZED RELEASE:** kompletna i aktualna ocena powyższych pozycji przez właściciela ochrony danych, wskazanie wersji tekstu i rzeczywistego działającego URL.
- **BEZ DODATKOWEJ ZGODY NIE WYKONYWAĆ:** zmiana podstaw prawnych, przechowywania, zgód i publikacja nowego tekstu na produkcji.

Ten plik jest checklistą przeglądu, a nie poradą prawną, polityką prywatności ani dowodem zgodności z RODO.
