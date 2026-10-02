# Procedura incydentu — Aktywnik+

## Cel

Procedura dotyczy przyszłej wersji chmurowej Aktywnik+ School. Lokalny pilot nie ma centralnej bazy uczniów.

## Priorytety

1. zatrzymać dalszy nieautoryzowany dostęp;
2. zabezpieczyć logi i dowody;
3. ustalić zakres danych i użytkowników;
4. odtworzyć bezpieczne działanie;
5. przekazać szkole informacje potrzebne do realizacji jej obowiązków jako administratora danych;
6. udokumentować przyczynę i działania naprawcze.

## Klasy incydentów

- A — niedostępność bez utraty poufności;
- B — błędne uprawnienia / możliwy dostęp do cudzych danych;
- C — potwierdzony nieautoryzowany dostęp lub ujawnienie danych;
- D — utrata lub uszkodzenie danych / problem z odtworzeniem.

## Reakcja techniczna

1. Wyłączyć `AKTYWNIK_CLOUD_SYNC` lub zagrożony endpoint.
2. Nie usuwać logów.
3. Zablokować zagrożony token/klucz/sesję.
4. Określić czas rozpoczęcia i zakończenia zdarzenia.
5. Określić tenant, klasy i rekordy objęte zdarzeniem.
6. Sprawdzić logi Vercel, Supabase i audyt aplikacyjny.
7. Zastosować poprawkę i test regresji.
8. Wznowić usługę dopiero po potwierdzeniu izolacji danych.

## Komunikacja ze szkołą

Aktywnik+ jako dostawca techniczny przekazuje szkole fakty techniczne i wspiera analizę. Szkoła/IOD decydują o obowiązkach formalnych, w tym ewentualnych zgłoszeniach.

## Po incydencie

- post-mortem;
- test odtworzenia;
- aktualizacja polityk RLS/testów;
- rotacja sekretów, jeśli potrzebna;
- wpis w audycie bezpieczeństwa;
- aktualizacja procedury.
