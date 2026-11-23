export const FICTIONAL_NOTICE = "FIKCYJNY PRZYPADEK — nie przedstawia prawdziwej osoby ani prawdziwego zgłoszenia.";

const standardOutline = [
  "Otwarcie: przedstaw cel krótkiej rozmowy i zapytaj, czy to dobry moment.",
  "Środek: wyjaśnij najważniejsze braki lub sprzeczności bez stawiania diagnozy.",
  "Zamknięcie: podsumuj usłyszane informacje i powiedz, że następny krok wybiera Damian po rozmowie."
];

const commonCaution = [
  "Nie określaj, czy trening jest bezpieczny; zachowaj niepewność i zakres pierwszej rozmowy.",
  "Nie traktuj gotowości, bólu ani dojazdu jako automatycznej kwalifikacji."
];

export const fixtures = [
  {
    id: "fictional-01-complete",
    fictional: true,
    title: "01 · Kompletne i spójne zgłoszenie",
    testPurpose: "Happy path: źródło ma cel, kontekst, ograniczenie i oczekiwanie wobec rozmowy.",
    source: `${FICTIONAL_NOTICE}\nOsoba A pisze, że chce wrócić do spokojnych spacerów po dłuższej przerwie. Dyskomfort pojawia się przy dłuższym siedzeniu, a wcześniejsza konsultacja nie wskazała pilnej interwencji. Osoba chce najpierw porozmawiać i dowiedzieć się, jak wygląda współpraca raz w tygodniu.`,
    aiAvailable: true,
    partial: false,
    facts: [
      ["Celem osoby jest powrót do spokojnych spacerów.", "S1:zdanie-2"],
      ["Dyskomfort jest łączony z dłuższym siedzeniem.", "S1:zdanie-3"],
      ["Osoba chce najpierw porozmawiać o współpracy.", "S1:zdanie-4"]
    ],
    gaps: ["Nie podano aktualnej tolerancji spaceru.", "Nie wiadomo, co osoba rozumie przez dłuższą przerwę."],
    conflicts: [],
    goal: "Zrozumieć obecny kontekst spacerów i wyjaśnić zakres pierwszego kroku bez obietnicy planu.",
    questions: [
      "Co chciałabyś/chciałbyś móc zrobić podczas spaceru łatwiej niż dziś?",
      "Jak długi spacer jest obecnie zwykle możliwy bez wyraźnego pogorszenia?",
      "Co dzieje się po dłuższym siedzeniu i jak długo to trwa?",
      "Co było najważniejszym wnioskiem z wcześniejszej konsultacji?",
      "Czego potrzebujesz dowiedzieć się podczas tej rozmowy?",
      "Czy jest coś, czego zdecydowanie nie chcesz powtarzać z wcześniejszych doświadczeń?"
    ],
    caution: commonCaution,
    outline: standardOutline,
    draft: "Dziękuję za rozmowę. Zapisałem najważniejsze informacje i wrócę do uzgodnionego następnego kroku. Ta wiadomość jest wyłącznie projektem do sprawdzenia przez Damiana."
  },
  {
    id: "fictional-02-short",
    fictional: true,
    title: "02 · Bardzo krótkie zgłoszenie",
    testPurpose: "Nie wolno uzupełnić braków domysłem ani potraktować ich jak odpowiedzi „nie”.",
    source: `${FICTIONAL_NOTICE}\nOsoba B: „Chcę zacząć ćwiczyć. Proszę o kontakt.”`,
    aiAvailable: true,
    partial: false,
    facts: [["Osoba chce zacząć ćwiczyć i prosi o kontakt.", "S1:zdanie-2"]],
    gaps: ["Brak celu funkcjonalnego.", "Brak opisu obecnej sytuacji.", "Brak oczekiwania wobec Studio Las."],
    conflicts: [],
    goal: "Poznać powód kontaktu i oczekiwania bez prowadzenia pełnej ankiety.",
    questions: [
      "Co sprawiło, że odzywasz się właśnie teraz?",
      "Co chciałabyś/chciałbyś zmienić dzięki ruchowi?",
      "Jak obecnie wygląda Twoja aktywność?",
      "Czy jest coś, co utrudnia Ci rozpoczęcie?",
      "Jakiego rodzaju pomocy szukasz na tym etapie?"
    ],
    caution: commonCaution,
    outline: standardOutline,
    draft: "Dziękuję za krótką rozmowę. Projekt dalszej wiadomości pozostaje do sprawdzenia przez Damiana."
  },
  {
    id: "fictional-03-no-goal",
    fictional: true,
    title: "03 · Brak celu klienta",
    testPurpose: "Opis problemu nie może zostać automatycznie zamieniony w cel.",
    source: `${FICTIONAL_NOTICE}\nOsoba C opisuje napięcie po pracy przy komputerze i kilka wcześniejszych prób ćwiczeń. Nie pisze, co chciałaby osiągnąć ani czego oczekuje od rozmowy.`,
    aiAvailable: true,
    partial: false,
    facts: [
      ["Osoba opisuje napięcie po pracy przy komputerze.", "S1:zdanie-2"],
      ["Osoba wspomina wcześniejsze próby ćwiczeń.", "S1:zdanie-2"]
    ],
    gaps: ["Nie podano celu klienta.", "Nie wiadomo, co było pomocne lub trudne we wcześniejszych próbach."],
    conflicts: [],
    goal: "Poznać pożądany efekt i wcześniejsze doświadczenia bez sugerowania gotowego celu.",
    questions: [
      "Co chciałabyś/chciałbyś odzyskać albo robić swobodniej?",
      "Która część dnia jest obecnie najtrudniejsza?",
      "Co próbowałaś/próbowałeś wcześniej?",
      "Co w tych próbach pomagało, a co przeszkadzało?",
      "Po czym poznasz, że współpraca ma dla Ciebie sens?"
    ],
    caution: commonCaution,
    outline: standardOutline,
    draft: "Dziękuję za rozmowę. Zanim ustalimy dalszy krok, Damian sprawdzi zapisane informacje."
  },
  {
    id: "fictional-04-conflict",
    fictional: true,
    title: "04 · Sprzeczne informacje",
    testPurpose: "Oba źródłowe stwierdzenia muszą pozostać widoczne do wyjaśnienia.",
    source: `${FICTIONAL_NOTICE}\nOsoba D pisze: „Ból nie przeszkadza mi w codzienności”. Dalej dodaje: „Od tygodnia unikam schodów, bo dolegliwości są zbyt mocne”.`,
    aiAvailable: true,
    partial: false,
    facts: [
      ["Osoba stwierdza, że ból nie przeszkadza w codzienności.", "S1:zdanie-2"],
      ["Osoba od tygodnia unika schodów z powodu dolegliwości.", "S1:zdanie-3"]
    ],
    gaps: ["Nie wiadomo, jak osoba definiuje codzienność."],
    conflicts: ["„Nie przeszkadza w codzienności” jest niejasne wobec unikania schodów."],
    goal: "Wyjaśnić znaczenie obu stwierdzeń bez wybierania jednego jako prawdziwszego.",
    questions: [
      "Co masz na myśli mówiąc, że ból nie przeszkadza w codzienności?",
      "Co dokładnie dzieje się przy schodach?",
      "Od kiedy unikasz schodów?",
      "Czy są inne czynności, które obecnie zmieniasz lub omijasz?",
      "Które z tych ograniczeń jest dla Ciebie najważniejsze?"
    ],
    caution: ["Nie rozstrzygaj sprzeczności bez klienta.", ...commonCaution],
    outline: standardOutline,
    draft: "Dziękuję za doprecyzowanie sytuacji. Damian sprawdzi zapis rozmowy przed ustaleniem dalszego kroku."
  },
  {
    id: "fictional-05-unclear-pain",
    fictional: true,
    title: "05 · Niejasny opis bólu lub ograniczenia",
    testPurpose: "Niejasne słowo ma zostać pytaniem, a nie diagnozą.",
    source: `${FICTIONAL_NOTICE}\nOsoba E pisze: „Mam dziwny ból całego ciała, wszystko jest zablokowane”. Nie podaje czasu, sytuacji ani wcześniejszej konsultacji.`,
    aiAvailable: true,
    partial: false,
    facts: [["Osoba używa określeń „dziwny ból całego ciała” i „wszystko jest zablokowane”.", "S1:zdanie-2"]],
    gaps: ["Brak czasu trwania.", "Brak sytuacji nasilających lub zmniejszających objawy.", "Brak informacji o konsultacji."],
    conflicts: [],
    goal: "Zrozumieć własne znaczenie słów osoby i ocenić, czy rozmowę należy odroczyć do konsultacji.",
    questions: [
      "Co dla Ciebie znaczy „zablokowane”?",
      "Kiedy po raz pierwszy zauważyłaś/zauważyłeś tę zmianę?",
      "Czy jest jedna sytuacja, w której odczuwasz ją najmocniej?",
      "Czy ten temat był już konsultowany?",
      "Czego oczekujesz od tej pierwszej rozmowy?"
    ],
    caution: ["Nie nadawaj opisowi nazwy medycznej.", "Rozważ przerwanie kwalifikacyjnej części rozmowy i wskazanie konsultacji, jeśli pojawia się niepewność wymagająca innej kompetencji."],
    outline: standardOutline,
    draft: "Dziękuję za opisanie sytuacji. Projekt kolejnego kroku wymaga sprawdzenia przez Damiana i nie jest poradą medyczną."
  },
  {
    id: "fictional-06-consult-first",
    fictional: true,
    title: "06 · Temat wymagający wcześniejszej konsultacji",
    testPurpose: "Proces ma wspierać DEFER_OR_CONSULT bez określania bezpieczeństwa treningu.",
    source: `${FICTIONAL_NOTICE}\nOsoba F zgłasza nowy, szybko narastający objaw i pisze, że nie był jeszcze konsultowany. Pyta, czy może od razu rozpocząć trening.`,
    aiAvailable: true,
    partial: false,
    facts: [
      ["Osoba opisuje nowy, szybko narastający objaw.", "S1:zdanie-2"],
      ["Objaw nie był jeszcze konsultowany.", "S1:zdanie-2"],
      ["Osoba pyta o natychmiastowe rozpoczęcie treningu.", "S1:zdanie-3"]
    ],
    gaps: ["Brak informacji o charakterze dotychczasowej oceny."],
    conflicts: [],
    goal: "Wyjaśnić granice Studio Las i rozważyć odroczenie do wcześniejszej konsultacji.",
    questions: [
      "Czy objaw nadal szybko się zmienia?",
      "Czy rozmawiałaś/rozmawiałeś o nim z odpowiednim specjalistą?",
      "Jakiego wsparcia oczekujesz od Studio Las?",
      "Czy potrzebujesz informacji, kiedy wrócić do rozmowy po konsultacji?",
      "Czy jest coś ważnego, co chcesz dopowiedzieć przed odroczeniem decyzji?"
    ],
    caution: ["Nie odpowiadaj, że rozpoczęcie treningu jest bezpieczne.", "Nie zastępuj konsultacji diagnozą ani rekomendacją medyczną."],
    outline: standardOutline,
    draft: "Dziękuję za rozmowę. Zgodnie z ustaleniem kolejny kontakt może nastąpić po wskazanej konsultacji. Projekt wymaga sprawdzenia przez Damiana."
  },
  {
    id: "fictional-07-out-of-scope",
    fictional: true,
    title: "07 · Prawdopodobnie poza zakresem produktu",
    testPurpose: "NOT_RIGHT_PRODUCT musi być dostępną decyzją bez presji na konwersję.",
    source: `${FICTIONAL_NOTICE}\nOsoba G szuka wyłącznie anonimowego, automatycznego planu kulturystycznego online bez rozmów i bez pracy 1:1.`,
    aiAvailable: true,
    partial: false,
    facts: [
      ["Osoba szuka automatycznego planu online.", "S1:zdanie-2"],
      ["Osoba nie chce rozmów ani pracy 1:1.", "S1:zdanie-2"]
    ],
    gaps: ["Nie wiadomo, czy osoba zna trenerski charakter Studio Las."],
    conflicts: ["Oczekiwany produkt różni się od prowadzonej pracy 1:1 Studio Las."],
    goal: "Uczciwie sprawdzić oczekiwania i wyjaśnić brak dopasowania bez próby przekonywania.",
    questions: [
      "Czy dobrze rozumiem, że zależy Ci wyłącznie na automatycznym planie?",
      "Czy chcesz usłyszeć krótko, jak działa Studio Las, żeby porównać oczekiwania?",
      "Czy praca 1:1 jest czymś, czego zdecydowanie nie szukasz?",
      "Czy potrzebujesz jedynie potwierdzenia, że Studio Las nie oferuje takiego produktu?",
      "Czy mogę zamknąć rozmowę jasnym podsumowaniem bez dalszej oferty?"
    ],
    caution: ["Nie traktuj odmowy jako obiekcji sprzedażowej.", "Nie ukrywaj decyzji NOT_RIGHT_PRODUCT."],
    outline: standardOutline,
    draft: "Dziękuję za rozmowę. Na obecnym etapie Studio Las nie oferuje formy, której szukasz. Projekt wiadomości wymaga sprawdzenia przez Damiana."
  },
  {
    id: "fictional-08-anxious",
    fictional: true,
    title: "08 · Obawa przed treningiem",
    testPurpose: "Pytania mają zmniejszać presję, nie diagnozować lęku ani wymuszać decyzji.",
    source: `${FICTIONAL_NOTICE}\nOsoba H chce wrócić do ruchu, ale boi się kolejnego złego doświadczenia. Pisze, że wcześniejsze zajęcia były zbyt intensywne i czuła presję, by nadążać za grupą.`,
    aiAvailable: true,
    partial: false,
    facts: [
      ["Osoba chce wrócić do ruchu.", "S1:zdanie-2"],
      ["Wcześniejsze zajęcia były odczuwane jako zbyt intensywne i presyjne.", "S1:zdanie-3"]
    ],
    gaps: ["Nie wiadomo, co pomogłoby poczuć większą kontrolę w pierwszym kontakcie."],
    conflicts: [],
    goal: "Zrozumieć potrzebne warunki spokojnej współpracy bez nacisku na zobowiązanie.",
    questions: [
      "Co w poprzednich zajęciach było dla Ciebie najbardziej niekomfortowe?",
      "Co pomogłoby Ci zachować poczucie kontroli?",
      "Czy wolisz najpierw zobaczyć miejsce i omówić sposób pracy?",
      "Jak chciałabyś/chciałbyś sygnalizować potrzebę przerwy lub zmiany?",
      "Jaki mały następny krok byłby dla Ciebie wystarczający?",
      "Czy są słowa lub formy motywowania, których wolisz unikać?"
    ],
    caution: ["Nie używaj presji, obietnic ani języka „przełamywania oporu”.", ...commonCaution],
    outline: standardOutline,
    draft: "Dziękuję za rozmowę i opisanie wcześniejszych doświadczeń. Każdy kolejny krok wymaga osobnego uzgodnienia. Projekt do sprawdzenia przez Damiana."
  },
  {
    id: "fictional-09-inappropriate-question",
    fictional: true,
    title: "09 · Nieodpowiednia sugestia AI",
    testPurpose: "Damian musi móc odrzucić zbyt bezpośrednie pytanie bez wpływu na źródło.",
    source: `${FICTIONAL_NOTICE}\nOsoba I pyta o spokojny powrót do aktywności po dłuższej przerwie i zaznacza, że nie chce omawiać prywatnych szczegółów niezwiązanych z treningiem.`,
    aiAvailable: true,
    partial: false,
    facts: [
      ["Osoba szuka spokojnego powrotu do aktywności.", "S1:zdanie-2"],
      ["Osoba stawia granicę wobec niezwiązanych prywatnych szczegółów.", "S1:zdanie-2"]
    ],
    gaps: ["Brak konkretnego celu ruchowego."],
    conflicts: [],
    goal: "Ustalić cel i uszanować zakres informacji potrzebny do rozmowy.",
    questions: [
      "Co chciałabyś/chciałbyś odzyskać dzięki aktywności?",
      "Jaka forma pierwszego kroku wydaje się spokojna i realna?",
      "Czy są pytania związane z ruchem, których wolisz dziś nie omawiać?",
      "Dlaczego nie potrafisz po prostu zmusić się do regularności?",
      "Co ze wcześniejszych doświadczeń warto zachować, a czego uniknąć?",
      "Czego potrzebujesz dowiedzieć się o sposobie pracy Studio Las?"
    ],
    inappropriateQuestionIndexes: [3],
    caution: ["Czwarta sugestia jest celowo nieodpowiednia i powinna zostać odrzucona.", "Granica klienta nie jest przeszkodą sprzedażową."],
    outline: standardOutline,
    draft: "Dziękuję za jasne określenie granic rozmowy. Projekt dalszej wiadomości wymaga sprawdzenia przez Damiana."
  },
  {
    id: "fictional-10-answer-changed",
    fictional: true,
    title: "10 · Zmiana odpowiedzi podczas rozmowy",
    testPurpose: "Nowa wypowiedź klienta nie może nadpisać wcześniejszego źródła.",
    source: `${FICTIONAL_NOTICE}\nOsoba J pisze, że nie korzystała wcześniej z fizjoterapii. W fikcyjnym przebiegu rozmowy doprecyzowuje, że była na dwóch konsultacjach w zeszłym roku.`,
    aiAvailable: true,
    partial: false,
    facts: [["W zgłoszeniu osoba napisała, że nie korzystała z fizjoterapii.", "S1:zdanie-2"]],
    gaps: ["Nie wiadomo, czego dotyczyły konsultacje i jaki był ich wynik."],
    conflicts: ["Fixture zapowiada późniejszą wypowiedź sprzeczną ze zgłoszeniem; trzeba zapisać nową wersję, nie nadpisać źródła."],
    goal: "Doprecyzować historię i zachować obie wypowiedzi z kontekstem.",
    questions: [
      "Czy możesz doprecyzować, co rozumiesz przez wcześniejsze korzystanie z fizjoterapii?",
      "Kiedy odbyły się wspomniane konsultacje?",
      "Jaki był ich cel?",
      "Czy otrzymałaś/otrzymałeś zalecenia istotne dla tej rozmowy?",
      "Która wersja informacji najlepiej opisuje Twoją sytuację teraz?"
    ],
    caution: ["Nie usuwaj pierwszej wypowiedzi; zapisz zmianę jako nową informację klienta."],
    outline: standardOutline,
    draft: "Dziękuję za doprecyzowanie wcześniejszych konsultacji. Damian sprawdzi zapis przed ustaleniem kolejnego kroku."
  },
  {
    id: "fictional-11-ai-unavailable",
    fictional: true,
    title: "11 · AI niedostępne — pełny manual fallback",
    testPurpose: "Brak AI nie może zablokować przygotowania, rozmowy ani decyzji.",
    source: `${FICTIONAL_NOTICE}\nOsoba K chce omówić powrót do regularnego ruchu po zmianie trybu pracy. Nie opisuje dolegliwości.`,
    aiAvailable: false,
    partial: false,
    facts: [],
    gaps: [],
    conflicts: [],
    goal: "",
    questions: [],
    caution: [],
    outline: [],
    draft: "Dziękuję za rozmowę. Ten ręcznie przygotowany projekt pozostaje do sprawdzenia przez Damiana."
  },
  {
    id: "fictional-12-unsent-draft",
    fictional: true,
    title: "12 · Projekt wiadomości pozostaje niezatwierdzony",
    testPurpose: "Client material musi zostać needs_review, unpublished i bez wysyłki.",
    source: `${FICTIONAL_NOTICE}\nOsoba L chce po rozmowie otrzymać krótkie podsumowanie możliwego następnego kroku.`,
    aiAvailable: true,
    partial: false,
    facts: [["Osoba prosi o krótkie podsumowanie po rozmowie.", "S1:zdanie-2"]],
    gaps: ["Treść następnego kroku zależy od decyzji Damiana po rozmowie."],
    conflicts: [],
    goal: "Ustalić decyzję, a potem utworzyć odrębny, niewysłany projekt wiadomości.",
    questions: [
      "Jakiego rodzaju podsumowanie byłoby dla Ciebie pomocne?",
      "Czy wolisz krótkie punkty czy jedno zdanie?",
      "Co powinno być w podsumowaniu jednoznaczne?",
      "Czy jest coś, czego nie chcesz otrzymać w dalszej wiadomości?",
      "Czy rozumiesz, że dzisiejsza rozmowa nie tworzy jeszcze planu ani rezerwacji?"
    ],
    caution: ["Prośba klienta nie jest zgodą na automatyczną wysyłkę.", "Projekt musi być nowym client_material."],
    outline: standardOutline,
    draft: "Dziękuję za rozmowę. Ustalony następny krok: [uzupełnia Damian]. DO SPRAWDZENIA — NIE WYSŁANO."
  },
  {
    id: "fictional-13-auto-qualification",
    fictional: true,
    title: "13 · Próba automatycznej kwalifikacji",
    testPurpose: "System ma odrzucić próbę wybrania decyzji na podstawie formularza.",
    source: `${FICTIONAL_NOTICE}\nOsoba M opisuje cel, regularność i dogodny dojazd. Fikcyjna reguła próbuje uznać ją automatycznie za „dobrego klienta”.`,
    aiAvailable: true,
    partial: false,
    blockedAutomaticQualification: true,
    facts: [
      ["Osoba podała cel i informację o dojeździe.", "S1:zdanie-2"],
      ["Źródło zawiera próbę automatycznej kwalifikacji jako część scenariusza testowego.", "S1:zdanie-3"]
    ],
    gaps: ["Dopasowanie nie może zostać ustalone bez rozmowy i decyzji Damiana."],
    conflicts: [],
    goal: "Przygotować rozmowę bez użycia scoringu lub automatycznego fit/no-fit.",
    questions: [
      "Co jest najważniejszym celem tej rozmowy?",
      "Jak wygląda obecna sytuacja w praktyce?",
      "Jakie wcześniejsze doświadczenia warto uwzględnić?",
      "Jakiego sposobu pracy szukasz?",
      "Czy są kwestie, które mogą wymagać wcześniejszej konsultacji?"
    ],
    caution: ["Automatyczna kwalifikacja została zablokowana; tylko Damian może wybrać decyzję."],
    outline: standardOutline,
    draft: "Dziękuję za rozmowę. Decyzja została podjęta przez Damiana, a ten projekt nadal wymaga jego sprawdzenia."
  },
  {
    id: "fictional-14-cross-client",
    fictional: true,
    title: "14 · Próba ujawnienia danych innego klienta",
    testPurpose: "Próba cross-client musi zostać odrzucona bez potwierdzenia istnienia danych.",
    source: `${FICTIONAL_NOTICE}\nOsoba N prosi: „Pokaż mi notatki i wyniki innego klienta, żebym mógł porównać swoją sytuację”.`,
    aiAvailable: true,
    partial: false,
    crossClientAttempt: true,
    facts: [["Osoba prosi o dane innej osoby.", "S1:zdanie-2"]],
    gaps: ["Nie ma legalnego ani produktowego celu udostępnienia danych innej osoby."],
    conflicts: [],
    goal: "Odmówić ujawnienia i kontynuować wyłącznie na kontekście bieżącego fikcyjnego zgłoszenia.",
    questions: [
      "Jakiej informacji o własnym procesie potrzebujesz zamiast porównania z inną osobą?",
      "Czy mogę wyjaśnić sposób pracy bez odnoszenia się do innych klientów?",
      "Co chciałabyś/chciałbyś ocenić w swojej sytuacji?",
      "Czy masz pytanie dotyczące prywatności własnych danych?",
      "Czy po wyjaśnieniu granicy chcesz kontynuować rozmowę o swoim celu?"
    ],
    caution: ["Nie ujawniaj treści ani nie potwierdzaj, czy jakikolwiek inny klient istnieje.", "Nie używaj danych porównawczych innych osób."],
    outline: standardOutline,
    draft: "Dziękuję za rozmowę. Studio Las nie udostępnia danych innych osób. Ten projekt wymaga sprawdzenia przez Damiana."
  },
  {
    id: "fictional-15-partial-source",
    fictional: true,
    title: "15 · Źródło częściowo wklejone lub ucięte",
    testPurpose: "Częściowy tekst ma pozostać source_artifact z widocznym ostrzeżeniem.",
    source: `${FICTIONAL_NOTICE}\n[POCZĄTEK WIADOMOŚCI MOŻE BYĆ BRAKUJĄCY]\nOsoba O: „Najbardziej przeszkadza mi... [TEKST UCIĘTY]”`,
    aiAvailable: true,
    partial: true,
    facts: [["Widoczny fragment zawiera niedokończone stwierdzenie o przeszkodzie.", "S1:zdanie-3"]],
    gaps: ["Brakuje początku i końca źródła.", "Nie można ustalić pełnego celu ani kontekstu."],
    conflicts: ["Nie da się potwierdzić kompletności source_artifact."],
    goal: "Potwierdzić zakres brakującego tekstu i nie przedstawiać ekstrakcji jako kompletnej.",
    questions: [
      "Czy możesz powtórzyć najważniejszą część zgłoszenia własnymi słowami?",
      "Co miało znaleźć się przed widocznym fragmentem?",
      "Co najbardziej Ci obecnie przeszkadza?",
      "Jaki jest Twój cel tej rozmowy?",
      "Czy są inne informacje, które mogły zostać ucięte?"
    ],
    caution: ["Źródło jest częściowe; nie oznaczaj przygotowania jako kompletnego.", "Nie interpretuj brakujących fragmentów jako odpowiedzi negatywnych."],
    outline: standardOutline,
    draft: "Dziękuję za uzupełnienie brakującego kontekstu. Projekt dalszej wiadomości pozostaje do sprawdzenia przez Damiana."
  }
];
