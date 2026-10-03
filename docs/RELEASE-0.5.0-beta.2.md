# Aktywnik+ 0.5.0-beta.2 — Pull & Merge

## Cel

Drugi etap synchronizacji trybu **Dla siebie**. Po bezpiecznym pushu z beta.1 aplikacja potrafi teraz również pobrać wpisy z chmury i scalić je z lokalnymi danymi.

## Nowe

- `GET /api/v1/sync` jest używany przez klienta do pobrania własnych wpisów;
- automatyczny cykl **push → pull** po zalogowaniu, odzyskaniu internetu i powrocie do aplikacji;
- brakujący wpis z innego urządzenia jest dodawany lokalnie;
- dla tego samego `client_entry_id` nowsza wersja czasowa wygrywa;
- jeżeli lokalna wersja jest nowsza, zostaje zachowana i wraca do kolejki wysyłki;
- import z chmury zapisuje lokalnie z `skipSync`, aby uniknąć pętli pull → push → pull;
- ostatni udany sync jest zapamiętywany lokalnie;
- statusy synchronizacji mają wersje PL/EN.

## Reguła konfliktu

Porównujemy kolejno:
- `updatedAt`,
- `stoppedAt`,
- `createdAt`.

Chmura aktualizuje wpis lokalny tylko wtedy, gdy jej znacznik czasu jest nowszy. Nowszy wpis lokalny nie jest nadpisywany.

## Nadal celowo wyłączone

- propagowanie usunięć między urządzeniami;
- automatyczne rozwiązywanie konfliktu jednoczesnej edycji z identycznym timestampem;
- synchronizacja trybu rodzinnego;
- produkcyjne włączenie chmury bez testów wielu kont.

Local-first pozostaje zasadą: brak sieci lub niedostępna chmura nie blokują START/STOP, ręcznych wpisów ani historii.
