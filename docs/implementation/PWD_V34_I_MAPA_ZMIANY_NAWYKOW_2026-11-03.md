# Studio Las OS — propozycja PWD 3.4 i trzeciej ankiety: Mapa zmiany zachowania
Data: 2026-11-03
Status: PREPARE / DO WERYFIKACJI — nie jest nowym Product/Architecture source of truth ani wdrożeniem.
Autoryzacja: przygotowanie zakresu i treści; brak zgody na produkcyjne DDL, zmianę Auth/RLS, merge i deployment.

## Wynik rozpoznania
1. Publiczna strona w main ma pierwszy kontakt v1; poprawiony v2 istnieje w Draft PR #102 i nie jest opublikowany. Nie przepisywać PR #102.
2. Produkcyjny Supabase ma aktywną i released wersję pre_pwd_first_visit 3.3; 3.2 jest retired. Wersja 3.3 używa rendererKey pre_pwd_v31 i validatorVersion pre_pwd_v31_v1. Wersje są immutable. Nie edytować 3.3 w miejscu.
3. Aktualny interfejs klienta opiera się o assets/os/questionnaires/pre-pwd-v31-definition.js i assets/os/ui/pre-pwd-v31-form.js. Serwer trzyma snapshot i weryfikuje zapis przez RPC. Zmiana widoczności bez wspólnej aktualizacji kontraktu serwera może zakończyć się odrzuceniem przekazania.
4. Trzy odrębne momenty: (A) pierwszy kontakt przed rozmową, (B) krótka ankieta bezpieczeństwa i przygotowania PWD po rozmowie, (C) pogłębiona Mapa zmiany zachowania po PWD, po wspólnej decyzji o priorytecie. C nie jest automatyczną oceną wszystkich obszarów życia.

## Cel i sposób oceny
Klient: mniej powtarzania i pytań niepowiązanych z celem; bezpieczne, godne i zrozumiałe przygotowanie wizyty.
Trener: karta 60 sekund z celem, ograniczeniem, bezpieczeństwem, realną możliwością i tematem do wyjaśnienia.
OS: jedna aktualna wskazówka, minimalny sygnał po działaniu, Uwaga trenera tylko przy wyjątku, Review po epizodzie.
Najważniejsza decyzja przed PWD: czy i na jakich warunkach można bezpiecznie rozpocząć ocenę, co obserwować i czego jeszcze trzeba się dowiedzieć.

## PWD v3.4 — proponowany zakres pytań

### A. Kontekst znany systemowi
- Nie pytaj ponownie o imię/nazwisko ani podstawowy kontakt klienta, jeśli system już je zna.
- Uwaga: obecne pola emergency_contact_name / phone / relation to kontakt awaryjny, NIE dane klienta. Nie usuwać historycznych danych. Ustalić w Product/Privacy, czy i kiedy kontakt awaryjny jest potrzebny; domyślnie przenieść zebranie do rozmowy/PWD, a nie usuwać bez zastępczego procesu bezpieczeństwa.
- Wiek: zachować obserwację tylko gdy nieznany; nie wprowadzać daty urodzenia dla wygody.
- Dotychczasowy cel z rozmowy pokazać jako kontekst, nie wymuszać przepisywania.

### B. Krótki rdzeń przed wizytą
| ID robocze | Pytanie dla klienta | Warunek / forma | Wpływ na decyzję |
|---|---|---|---|
| pwd_goal_current | Czy cel ustalony podczas rozmowy nadal jest dla Ciebie aktualny? | Tak / Chcę doprecyzować / Zmienił się | Weryfikacja celu |
| pwd_goal_changed | Co jest teraz dla Ciebie najważniejsze? | Otwórz tylko po zmianie lub doprecyzowaniu, tekst opcjonalny | Kierunek rozmowy |
| pwd_function | Na ile możesz dziś wykonywać tę ważną czynność? | Skala 0–10 z opisem końców, opcja „trudno ocenić” | Punkt odniesienia, bez diagnozy |
| pwd_obstacle | Co najbardziej Ci w tym przeszkadza? | Maks. dwie odpowiedzi, w tym „nie wiem” | Wstępny obszar obserwacji |
| pwd_current_activity | Jak wyglądała Twoja aktywność w ostatnich 4 tygodniach? | 4 czytelne opcje | Dawkowanie oceny |
| pwd_repeat_obstacle | Co zwykle utrudnia Ci regularne działanie? | Maks. 2 odpowiedzi; opcjonalne | Realność dalszego planu |
| pwd_availability | Ile czasu realnie możesz przeznaczyć na samodzielne działanie w typowym tygodniu? | Krótkie widełki + „ustalę na wizycie”; opcjonalne | Proporcjonalna dawka prowadzenia |
| pwd_context | Czy jest jakiś aspekt dnia, pracy, snu, regeneracji lub stresu, który Twoim zdaniem warto omówić już na pierwszej wizycie? | Wielokrotny wybór + „nie teraz”; opcjonalne. Bez szczegółowych skal | Zaproszenie do rozmowy, nie pomiar stylu życia |
| pwd_working_preferences | Co pomoże Ci czuć się bezpiecznie i swobodnie podczas spotkania? | Maks. 2 opcje, opcjonalne | Styl współpracy |
| pwd_other | Czy jest coś ważnego, co chcesz przekazać przed wizytą? | Opcjonalny tekst; z ostrzeżeniem, by nie wysyłać dokumentacji ani pilnych zgłoszeń | Kontekst wyłącznie potrzebny do wizyty |

### C. Bezpieczeństwo — obowiązkowy osobny tor
- Zachować istniejący kontrolowany przez zgodę blok danych zdrowotnych i bezpieczeństwa. Bez klinicznego przeglądu nie usuwać pytań o objawy wysiłkowe, aktualne ograniczenia zalecone przez specjalistów, poważne choroby/urazy ani sygnały alarmowe.
- W nowej wersji uprościć prezentację: pytania wstępne dla wszystkich, szczegóły tylko po istotnej odpowiedzi; nie pokazywać całej historii bólu każdemu.
- Nie generować samodzielnej diagnozy ani automatycznej kwalifikacji. Nie rozsyłać treści zdrowotnych w e-mailach, URL, analityce ani niezatwierdzonych narzędziach AI.
- Zgody, legal basis, przedwczesny autosave, wycofanie zgody i klient-safe boundary wymagają oddzielnej weryfikacji; nie zmieniać istniejącego tekstu prawnego przez refaktor UI.
- Pilne sygnały medyczne muszą prowadzić do bezpiecznej, zgodnej z kompetencjami informacji, a nie czekania na automatyczną wiadomość w aplikacji.

### D. Co przestaje być wymagane przed PWD
- Obowiązkowy litraż wody, warzywa/owoce, regularność posiłków.
- Rutynowe skale 0–10 snu, energii i stresu u każdego.
- Szczegółowe rozkłady siedzenia i pracy oraz przyszła intensywność sportowa bez związku z celem.
- Rozbudowana ocena historii „dlaczego nie udawało się wytrwać” — to materiał do Mapa zmiany zachowania lub rozmowy, nie obowiązkowy screening.
Wszystkie te tematy nadal mogą być ważne i mogą pojawić się później celowo.

## Ankieta nr 3 — Mapa zmiany zachowania
**Moment:** po PWD, po wybraniu z klientem konkretnego obszaru i doprecyzowaniu, co naprawdę chce zmienić. Szersza biblioteka pytań, ale widoczny tylko moduł dotyczący zatwierdzonego priorytetu. Nie domyślne „wypełnij wszystko”.
**Wartość:** ustalić, co uniemożliwia działanie w konkretnej rzeczywistej sytuacji, jakie warunki można zmienić i jaka dawka wsparcia jest potrzebna. Bez diagnozy psychologicznej.

### Rdzeń Mapa zmiany zachowania (ok. 8–10 pytań)
1. Jakie jedno zachowanie lub ważną czynność chcesz teraz zmienić? Własnymi słowami; zatwierdzony cel z PWD jako punkt wyjścia.
2. Opisz ostatnią konkretną sytuację, w której chciałeś/chciałaś to zrobić, a nie wyszło (albo wyszło). Kiedy i w jakich warunkach?
3. Co nastąpiło tuż przed tą sytuacją? Pora, miejsce, obowiązki, ludzie, dostępne warunki — nie zbieramy prywatnych zwierzeń.
4. Co faktycznie zrobiłeś/zrobiłaś? Rozdzielić deklarację od interpretacji.
5. Co najbardziej utrudniało działanie? Wiedza/umiejętność/zdolność (capability), czas/otoczenie/wsparcie (opportunity), znaczenie/obawy/automatyzm (motivation). Zawsze opcja „nie wiem / wolę porozmawiać”.
6. Co już choć raz pomogło? Szukać rzeczywistych wyjątków od problemu.
7. Jak bardzo ta zmiana jest dla Ciebie ważna i jak realna wydaje się w tym tygodniu? Oddzielne pytania, bez etykiety „brak motywacji”.
8. Jaki najmniejszy krok byłby wykonalny w dobrej wersji dnia (Plan A)? Klient proponuje, trener wybiera i zatwierdza.
9. Co można zrobić w trudnym dniu (Plan B) i jaki sygnał miałby sens, jeśli to nie wyjdzie?
10. Jaki rodzaj wsparcia preferujesz: rozmowa, krótkie przypomnienie na papierze, instrukcja, demonstracja, krótka informacja w OS, kontakt zgodny z zakresem prowadzenia? Preferencja nie jest automatyczną obietnicą nielimitowanego kontaktu.

### Moduły warunkowe, nie uniwersalny zestaw
- Ruch i aktywność spontaniczna: organizacja dnia, transport, otoczenie, wcześniejsze doświadczenia z ruchem.
- Sen i regeneracja: rytm, okna czasowe, trudność wdrożenia prostego ustalenia; nie diagnozować zaburzeń snu.
- Żywienie i nawodnienie: organizacja zakupów i posiłków, warunki pracy, wykonalność uzgodnionego kroku; bez leczenia dietetycznego.
- Stres i dobrostan: wyłącznie pytania o praktyczne warunki i potrzebne wsparcie, bez testowania zdrowia psychicznego i archiwizacji zwierzeń; skierować do specjalisty, kiedy właściwe.
- Regularność działań: kontekst ostatniego epizodu, przeszkody, ułatwienia, Plan B i realne tempo.
Jeśli temat dotyka zdrowia albo innych kategorii wrażliwych, uruchomienie modułu wymaga celowo dobranej podstawy prawnej, retencji i zgody/uprawnienia.

## Jak OS rzeczywiście wspiera zmianę
1. Trener przypisuje konkretny moduł po PWD; klient odpowiada świadomie. OS zapisuje źródłowe wypowiedzi oddzielnie od hipotez.
2. Trener ogląda krótką kartę: zachowanie / ostatnia sytuacja / przeszkoda / co pomogło / warunek wykonania / do sprawdzenia. AI może przygotować szkic tylko na zatwierdzonym zapleczu, bez niezależnego rozstrzygnięcia.
3. Trener publikuje **jedną aktualną wskazówkę**: cel, działanie A, wersja B, kontekst wykonania, ewentualna krótka edukacja, jeden minimalny sygnał. Papier, aplikacja lub hybryda wybierane według potrzeb klienta.
4. Klient wykonuje działanie poza ekranem. OS po działaniu pozwala na krótką odpowiedź: „wykonałem”, „zastosowałem wersję B”, „potrzebuję zmiany/rozmowy”, z opcjonalnym powodem tylko w wyjątku. Brak streaków i codziennego wyniku.
5. OS grupuje wyjątki do istniejącej „Uwagi trenera”, deduplikuje, nie wysyła samodzielnej interpretacji. Trener decyduje: zostawić, uprościć, zmienić kontekst, zrobić przerwę lub omówić.
6. Review po uzgodnionym okresie, zwykle ok. 12 tygodni: funkcjonalny rezultat, sprawczość, realna wykonalność, koszty uwagi CAH/ACL, kolejna dawka prowadzenia.
7. Preferować istniejące Client / Goal / Plan / Execution / Signal / Flag / Coach Decision / Review. Nie tworzyć teraz drugiego silnika planów ani osobnego habit trackera.

## Zmiany techniczne — tylko PREPARE
- Nowa wersja formularza pre-PWD **3.4**, nie mutacja released 3.3. Nie nadpisać historycznych przypisań ani odpowiedzi.
- Nowy kontrakt renderowania/validator tylko po sprawdzeniu istniejących RPC, zapisu wersji, immutable snapshotów, consent i aktywnego deployu. W szczególności profileFields, mandatory questions i visibility muszą zgadzać się w przeglądarce i serwerze.
- Trzecia ankieta jako nowa rodzina formularza w istniejącym systemie questionnaires, a nie nowa baza; ostateczna decyzja po sprawdzeniu obecnych API, RLS, auth i cyklu życia odpowiedzi.
- Nie zmieniać obecnego Auth, MFA, RLS, zaproszeń, PR #102 ani infrastruktury kopii.
- Weryfikować przed wydaniem: (1) nowy klient + aktualny 3.4, łącznie z odpowiedziami warunkowymi, świadomym przekazaniem i zgodą; oraz istniejący klient na 3.3 bez regresji; (2) rzeczywista sesja trenera AAL2 i klienta, odmowa AAL1/obcej osoby, poprawny brief i brak ujawnienia danych. Nie ogłaszać PASS bez dowodu.

## Źródła i granice
- Master Prompt v1.1, Wizja i Doktryna (25.10), Aneks (25.10), README rejestru, Constitution, Product i Architecture.
- Stan kodu: gałąź codex/production-home-cleanup-20260929, pliki pre-pwd-v31-definition.js, pre-pwd-v3-definition.js, pre-pwd-v31-form.js, client-questionnaire-controller.js, questionnaire-api.js.
- Odczyt produkcyjny 03.11.2026 SELECT-only: pre_pwd_first_visit 3.3 released i nie-retired, renderer pre_pwd_v31, validator pre_pwd_v31_v1. Nie czytano odpowiedzi klientów.
- Koncepcja COM-B: Michie, van Stralen, West (2011), doi:10.1186/1748-5908-6-42. Model narzędzie do stawiania pytań, nie kliniczny test i nie „punktacja motywacji”.
- Dokument nie zatwierdza zdrowotnych formularzy, prywatności, interpretacji medycznej ani wdrożenia.
