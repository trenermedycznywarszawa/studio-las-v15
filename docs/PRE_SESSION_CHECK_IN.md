# Studio Las — pre-session check-in

Status: product concept / developer specification

## Cel

Wprowadzić bardzo krótki check-in przed treningiem lub sesją 1:1, który dostarcza trenerowi minimalnego kontekstu potrzebnego do bezpiecznego i sensownego dopasowania przebiegu sesji.

Główna zasada produktowa:

> Zbieramy dane tylko wtedy, gdy mogą zmienić decyzję treningową.

Check-in nie jest dziennikiem zdrowia, narzędziem diagnostycznym ani kolejnym trackerem do codziennego odhaczania. Ma być lekki, szybki i użyteczny.

## Założenia UX

- czas wypełnienia: docelowo 20–30 sekund,
- 3–5 pytań maksymalnie w MVP,
- prosta skala 1–5,
- duże, czytelne opcje odpowiedzi,
- brak presji, streaków i gamifikacji,
- możliwość pominięcia,
- język codzienny, nie medyczny,
- klient może wypełnić check-in sam przed sesją albo trener może zaznaczyć odpowiedzi wspólnie z klientem na miejscu.

## Proponowany MVP

### 1. Sen / regeneracja
Pytanie przykładowe: **Jak Ci się spało?**

Skala 1–5:
1. bardzo źle
2. słabo
3. przeciętnie
4. dobrze
5. bardzo dobrze / jestem wyspany

### 2. Energia
Pytanie przykładowe: **Ile masz dziś energii?**

Skala 1–5 od bardzo małej do bardzo dużej.

### 3. Ból lub ograniczenie
Pytanie przykładowe: **Czy coś dziś boli albo wyraźnie ogranicza ruch?**

Preferowany kierunek MVP: prosta skala 1–5 + opcjonalna krótka notatka, jeśli klient chce doprecyzować.

### 4. Gotowość do treningu
Pytanie przykładowe: **Jak bardzo czujesz się dziś gotowy do treningu?**

Skala 1–5.

### 5. Opcjonalny kontekst
Jedno krótkie pole tekstowe, np. **Czy jest dziś coś ważnego, o czym powinienem wiedzieć przed treningiem?**

Pole nieobowiązkowe.

## Jak trener korzysta z danych

Przed rozpoczęciem sesji trener widzi krótkie podsumowanie odpowiedzi, bez rozbudowanego dashboardu i bez nadmiaru metryk.

Celem danych jest pomoc w decyzjach takich jak:

- czy wykonać planowaną sesję bez zmian,
- czy zmniejszyć intensywność lub objętość,
- czy zmienić kolejność ćwiczeń,
- czy wybrać wariant lżejszy / regeneracyjny,
- czy najpierw porozmawiać z klientem i zebrać dodatkowy kontekst.

Sam wynik check-inu nie powinien automatycznie modyfikować planu.

## Rola AI

W przyszłości AI może analizować historię check-inów wraz z kontekstem sesji i proponować trenerowi hipotezy lub sugestie, np. że kilka gorszych nocy z rzędu często współwystępuje z gorszą tolerancją większej objętości.

Zasady:

- AI nie diagnozuje,
- AI nie przedstawia korelacji jako przyczynowości,
- AI nie podejmuje samodzielnie decyzji treningowej,
- sugestia AI pozostaje wsparciem decyzji trenera,
- ostateczna interpretacja i decyzja należą do trenera.

Preferowany język systemu:

- „w historii pojawia się taki wzorzec”,
- „warto zwrócić uwagę”,
- „możliwe, że warto dziś rozważyć…”,

zamiast:

- „to powoduje…”,
- „powinieneś…”,
- „system zdecydował…”.

## Kierunek na przyszłość

Jeżeli funkcja okaże się użyteczna, część danych może być pobierana automatycznie z obsługiwanych źródeł, np. Apple Health, Polar lub innych urządzeń i platform. Celem integracji ma być ograniczenie ręcznego wpisywania danych, a nie zwiększanie liczby śledzonych parametrów.

Nie należy dodawać nowych metryk tylko dlatego, że są technicznie dostępne. Każda nowa dana powinna przejść pytanie:

> Czy ta informacja może realnie zmienić decyzję trenera lub następny krok klienta?

Jeśli nie — nie jest potrzebna w tym module.

## Zgodność z filozofią Studio Las

Moduł wspiera istniejący model pracy Studio Las:

**kontekst → interpretacja trenera → świadoma decyzja → następny krok**

Check-in ma zwiększać jakość kontekstu, ale nie zastępować rozmowy, obserwacji, profesjonalnego osądu ani adaptacyjnego przebiegu sesji.

## Poza zakresem MVP

- rozbudowany tracking zdrowia,
- liczenie kalorii,
- pełny dziennik snu lub żywienia,
- streaki, punkty, odznaki i challenge,
- automatyczne diagnozy,
- automatyczna zmiana programu treningowego,
- scoring typu „readiness 62/100” jako główna decyzja,
- rozbudowane wykresy dla klienta.

## Kryterium sukcesu

Funkcja jest wartościowa wtedy, gdy klient wypełnia ją bez irytacji, a trener dzięki niej choć czasami podejmuje lepszą lub szybszą decyzję dotyczącą danej sesji.

Jeżeli check-in zaczyna być obowiązkiem samym w sobie albo zbiera dane, z których nikt nie korzysta, należy go uprościć.
