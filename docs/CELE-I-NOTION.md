# Aktywnik+ · cele i integracja Notion

## Dostępne w wersji roboczej

- Cele czasowe na 7, 14 i 21 dni oraz miesiąc kalendarzowy, osobno na każdy profil dziecka.
- Porównanie bieżącego okresu z odpowiadającą liczbą dni poprzedniego okresu. Porównanie nie udaje zakończonego tygodnia lub miesiąca.
- Seria aktywnych dni, liczona od dzisiaj albo wczoraj. Wpis odrzucony nie liczy się do serii.
- Szybki Start dla basenu, judo, piłki nożnej, SKS i treningu klubowego. Moment startu pozostaje zapisany lokalnie, a zatrzymanie tworzy zwykły wpis z kontrolą rodzica.
- Lokalna kopia JSON obejmuje ustawienia celów danego profilu. Cele nie są jeszcze synchronizowane w Supabase.
- Eksport pełnej historii wybranego profilu do standardowego CSV, razem z wpisami oczekującymi i odrzuconymi, w przeciwieństwie do raportu okresowego, który bazuje na zatwierdzonych wpisach.

## Notion

Na razie dostępny jest eksport CSV do importu do bazy Notion, a także pełny backup JSON. **Nie ma jeszcze automatycznej wysyłki wpisów z aplikacji do Notion.**

Aby dodać bezpieczny zapis bezpośredni po zakończeniu aktywności:
1. Użytkownik musi wybrać bazę danych Notion z uprawnieniem do tworzenia stron.
2. Zapewnić OAuth Notion lub uprawnienia integracji wyłącznie dla wybranej bazy; token przechowywać w backendzie, nigdy w kodzie PWA.
3. Wysyłać zatwierdzone wpisy na podstawie trwałego identyfikatora źródłowego. Zapobiegać duplikatom i obsługiwać ponowne próby offline.
4. Rodzic powinien sam decydować o eksporcie danych dziecka, a domyślnie nie wysyłamy notatek prywatnych ani danych zdrowotnych.
5. Wprowadzić pole statusu synchronizacji Notion, możliwość zatrzymania integracji, usunięcia tokenu i ręcznego ponowienia.
6. Testować na syntetycznej bazie testowej, bez danych nieletnich, przed produkcyjnym włączeniem.

Przy dostosowywaniu schematu Notion użyj kolumn: Name/Aktywność (title), Data (date), Minuty (number), Status (select), Źródło (select), Zmęczenie (number), Notatka (rich text), Profil (select). CSV zawiera powyższe informacje.

## Synchronizacja celów

Cele istnieją w `children[].motivationGoals` w lokalnym stanie Aktywnika i w kopii JSON. Obecne API synchronizacji osobistej i rodzinnej nie przenosi tych ustawień. Przed obietnicą pełnego multi-device należy dodać model danych, RLS i migrację zgodną z dotychczasowymi kontami oraz przetestować aktualizacje z dwóch urządzeń.

## Bezpieczeństwo i motywacja

Dni odpoczynku są normalne. Brak publicznych rankingów nieletnich i presji na wydłużanie czasu ruchu. Rodzic nadal zatwierdza aktywności tam, gdzie jest to wymagane. Nie przełączamy automatycznie zapisów na status zatwierdzony przy osiągnięciu celu.
