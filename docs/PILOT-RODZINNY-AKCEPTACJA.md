# Pilot rodzinny Aktywnik+ — test akceptacyjny

Wersja bazowa: **0.5.0-beta.3**.

Celem jest sprawdzenie zachowania na prawdziwych urządzeniach. To nie jest test nowych funkcji — sprawdzamy, czy wdrożone mechanizmy zachowują się poprawnie w codziennym użyciu.

## Przygotowanie

1. Na urządzeniu A otwórz produkcję i zaloguj konto rodzica.
2. Potwierdź, że rodzic widzi co najmniej dwa różne profile dzieci.
3. Na urządzeniu B otwórz tę samą produkcję/PWA i użyj właściwego profilu dziecka.
4. Nie używaj prawdziwych wrażliwych danych w testowych notatkach.

## Scenariusze krytyczne

| Test | Czynność | Oczekiwany wynik |
| --- | --- | --- |
| Nowy wpis | Dziecko dodaje aktywność na urządzeniu B | Rodzic widzi właściwy wpis przy właściwym dziecku |
| Akceptacja | Rodzic zatwierdza wpis | Status na drugim urządzeniu zmienia się na zatwierdzony |
| Korekta | Rodzic zmienia czas wpisu | Nowy czas synchronizuje się i jest oznaczony jako korekta |
| Odrzucenie | Rodzic odrzuca wpis z powodem | Drugie urządzenie widzi odrzucenie i powód |
| Usunięcie | Usuń wpis na jednym urządzeniu | Wpis nie wraca po synchronizacji na drugim urządzeniu |
| Offline | Dodaj wpis bez sieci, potem włącz sieć | Lokalny wpis pozostaje i synchronizuje się po powrocie online |
| Rodzeństwo | Dodaj wpis tylko dla dziecka A | Dziecko B nie widzi danych dziecka A |
| Restart PWA | Zamknij i uruchom zainstalowaną PWA | Dane lokalne i właściwy profil nadal są dostępne |
| Raport | Wygeneruj raport miesięczny | PDF/druk zawiera właściwe dziecko, daty i czasy |
| PIN rodzica | Spróbuj wejść do strefy rodzica jako dziecko | Strefa pozostaje zablokowana bez prawidłowego PIN-u |

## Pilot 3–7 dni

Codziennie wystarczy sprawdzić:
- czy wpisy nie znikają;
- czy nie pojawiają się duplikaty;
- czy statusy rodzica są zgodne na obu urządzeniach;
- czy aplikacja nadal działa po zamknięciu i ponownym uruchomieniu;
- czy liczba kliknięć lub komunikaty nie utrudniają dziecku samodzielnego używania.

Nie zmieniamy funkcji w trakcie pilota, chyba że pojawi się błąd powodujący utratę danych, naruszenie izolacji lub blokujący używanie.

## Jak zgłosić problem

Do każdego błędu zanotuj:
1. urządzenie i przeglądarkę/PWA;
2. profil: rodzic / dziecko A / dziecko B;
3. tryb sieci: online / offline / powrót online;
4. co zostało kliknięte;
5. czego oczekiwano;
6. co faktycznie się stało;
7. czy błąd powtarza się drugi raz;
8. zrzut ekranu, jeśli nie zawiera wrażliwych danych.

## Kryterium zakończenia

Pilot rodzinny można uznać za zaakceptowany, jeśli przez 3–7 dni:
- nie wystąpi utrata danych;
- nie wystąpi wyciek danych pomiędzy rodzeństwem;
- synchronizacja po reconnect działa;
- decyzje rodzica i usunięcia są spójne na dwóch urządzeniach;
- PWA uruchamia się ponownie bez utraty stanu.

Po pilocie beta.4 powinna zawierać wyłącznie poprawki wynikające z realnych obserwacji, bez dokładania zakresu „na zapas”.
