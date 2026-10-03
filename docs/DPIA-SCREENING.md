# DPIA screening — Aktywnik+ School

To jest **arkusz wstępnej oceny**, a nie gotowa decyzja prawna. Administrator danych powinien wykonać screening przed formalnym wdrożeniem i — jeżeli charakter, zakres, kontekst i cele przetwarzania wskazują na wysokie ryzyko — przeprowadzić DPIA.

## Pytania screeningowe

| Pytanie | Stan projektu |
| --- | --- |
| Czy dotyczą dzieci / osób wymagających zwiększonej ochrony? | Tak — przy wdrożeniu szkolnym |
| Czy aplikacja wymaga danych szczególnej kategorii? | Nie — projekt ich nie wymaga |
| Czy używa GPS, masy ciała, kalorii lub danych medycznych? | Nie |
| Czy tworzy ranking lub profiling dzieci? | Nie |
| Czy decyzje o ocenach są automatyczne? | Nie — reguły pozostają po stronie szkoły/nauczyciela |
| Czy będzie centralna baza wielu użytkowników? | Tak — wyłącznie w wariancie School |
| Czy występuje kontrola dostępu wieloról/tenant? | Tak — RLS i role są wdrożone technicznie |
| Czy system prowadzi monitoring publicznej przestrzeni? | Nie |
| Czy dane są publiczne? | Nie |
| Czy szkoła ustaliła podstawę prawną, retencję i role? | Do decyzji szkoły/IOD |

## Materiał do decyzji administratora/IOD

Przed wdrożeniem szkoła powinna udokumentować:
- cel i zakres przetwarzania;
- kategorie osób i danych;
- podstawę prawną;
- role administratora/podmiotów przetwarzających;
- odbiorców i dostawców;
- retencję;
- sposób realizacji praw osób;
- ryzyka dla dzieci;
- środki techniczne i organizacyjne;
- wynik screeningu i decyzję: DPIA wymagana / niewymagana wraz z uzasadnieniem.

## Stan techniczny pomocny w ocenie

- minimalizacja danych;
- brak GPS i danych medycznych;
- brak rankingów;
- RLS na wszystkich publicznych tabelach;
- brak grantów `anon`;
- konta dorosłych przez Supabase Auth;
- fail-closed cloud sync;
- lokalna alternatywa i eksport danych.

## Źródła

- UODO — wskazówki dotyczące oceny skutków: https://uodo.gov.pl/pl/598/3617
- RODO, art. 35: https://eur-lex.europa.eu/eli/reg/2016/679/oj?locale=PL
