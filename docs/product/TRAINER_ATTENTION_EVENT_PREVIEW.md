# Podgląd kolejki opartej na zdarzeniach

Podgląd używa istniejącego `buildTrainerAttentionModel()` oraz kolektora sygnałów Studio Las. Otwiera się z pustą kolejką. Zwykła sesja, informacyjny zapis obciążenia i brak pomiarów nie tworzą sprawy. Nie dodaje progów ani nowych reguł do runtime.

Uruchomienie: `python3 -m http.server 8793 --bind 127.0.0.1`, następnie `http://127.0.0.1:8793/tools/trainer-attention-lab.html`.

Przykłady są fikcyjne: pytanie klienta w istniejącym zdarzeniu check-in, wzrost zgłoszonych dolegliwości po sesji oraz kontakt oznaczony przez trenera jako wymagający zakończenia. Każdy przykład resetuje historię podglądu. Przegląd bez zmiany usuwa sprawę z kolejki. Potrzebny kontakt pozostaje otwarty do wyraźnego zakończenia. Decyzje zachowują źródło w historii.

Stan istnieje tylko w pamięci. Podgląd nie korzysta z danych, logowania ani API klientów; CSP blokuje połączenia sieciowe. Zmiany CSS są ograniczone do klasy strony podglądu. Główny pakiet wdrożeniowy nie zawiera plików tego narzędzia. Zmiana nie uruchamia powiadomień poza ekranem, push ani wiadomości.

Weryfikacja: `node scripts/test_trainer_attention_lab.mjs` oraz istniejące testy modelu, runtime i domykania kontaktu. `scripts/e2e_trainer_attention_lab.mjs` sprawdza interakcje w Chromium na komputerze i telefonie, brak zapisów i brak połączeń zewnętrznych. Korzysta z tego samego narzędzia Playwright co istniejące testy przeglądarkowe repozytorium.

Kryterium przyszłej oceny przez trenera: rozpoznać powód i źródło sprawy, otworzyć kontekst, oznaczyć ją jako przejrzaną lub potrzebującą kontaktu, a następnie potwierdzić jej zakończenie bez dublowania wpisów. Przy braku zdarzeń widok pozostaje neutralnie pusty.

Zakres tej próby kończy się na interaktywnym podglądzie. Podłączenie do danych i wdrożenie produkcyjne wymagają osobnego zadania. Ocena produktu przez użytkownika pozostaje odłożona.
