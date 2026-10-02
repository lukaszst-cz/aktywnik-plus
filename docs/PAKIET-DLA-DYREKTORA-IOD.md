# Pakiet wdrożeniowy dla dyrektora / IOD — Aktywnik+

## 1. Cel rozwiązania

Aktywnik+ upraszcza prowadzenie Dziennika Dodatkowej Aktywności Fizycznej:
- rodzina może korzystać cyfrowo albo papierowo;
- rodzic zatwierdza wpisy;
- nauczyciel otrzymuje raport zamiast przepisywać pojedyncze wpisy;
- papier pozostaje równoważną ścieżką.

## 2. Minimalny zakres danych

Planowany minimalny zakres:
- techniczny identyfikator;
- nazwa wyświetlana / identyfikator dziecka;
- przypisanie do klasy;
- data, rodzaj i czas aktywności;
- opcjonalna uwaga/wysiłek;
- status akceptacji i raportu.

Nie są wymagane:
- GPS;
- adres;
- masa ciała;
- kalorie;
- dane medyczne;
- zdjęcie twarzy.

## 3. Role

- dziecko — dodaje własne wpisy;
- rodzic/opiekun — zatwierdza i zarządza profilem dziecka;
- nauczyciel — widzi tylko przypisane klasy i raporty;
- administrator szkoły — zarządza strukturą organizacji;
- administrator techniczny — infrastruktura, bez zwykłego dostępu do treści uczniów.

## 4. Architektura

- frontend/PWA: Vercel;
- planowany backend: Supabase/PostgreSQL;
- izolacja szkół: tenant;
- autoryzacja: RLS + role;
- transport: HTTPS;
- publiczne repo nie zawiera danych dzieci.

## 5. Retencja — do ustalenia przez szkołę

Do decyzji szkoły/IOD:
- jak długo trzymać aktywności;
- jak długo trzymać raporty;
- kiedy archiwizować klasę;
- kiedy usuwać dane po zakończeniu roku;
- jaki okres dla logów technicznych.

## 6. Pytania do screeningu DPIA

1. Czy szkoła planuje centralnie przetwarzać dane wszystkich uczniów klasy?
2. Czy system ma być obowiązkowy czy dobrowolny?
3. Czy występuje systematyczne monitorowanie dzieci?
4. Czy będą przetwarzane dane szczególnych kategorii?
5. Czy będą tworzone profile/oceny automatyczne?
6. Czy skala i charakter przetwarzania mogą powodować wysokie ryzyko?
7. Jakie są skutki błędu uprawnień lub ujawnienia danych?

Aktywnik+ projektowo unika GPS, danych zdrowotnych, rankingów i automatycznego profilowania.

## 7. Decyzje wymagane od szkoły

- cel i podstawa prawna;
- zakres danych;
- dobrowolność/obowiązkowość;
- administrator/podmiot przetwarzający;
- retencja;
- zasady dostępu;
- sposób realizacji praw osób;
- wynik screeningu DPIA;
- procedura incydentowa po stronie szkoły.

## 8. Status techniczny

Pilot lokalny działa bez kont i centralnej bazy.
Backend 0.1.3 działa w trybie fail-closed i czeka na produkcyjną bazę/auth/RLS.
