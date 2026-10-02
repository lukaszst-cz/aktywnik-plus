# Integracja Aktywnik+ ↔ DocPilot — import kart papierowych

## Cel

Nauczyciel nie powinien przepisywać ręcznie całego papierowego dziennika.

DocPilot może zrobić skan/OCR kartki, a Aktywnik+ przyjąć wynik jako CSV, JSON lub tekst tabelaryczny. Nauczyciel widzi podgląd, poprawia ewentualne błędy OCR i dopiero wtedy zapisuje import.

## Przepływ

1. Zeskanuj lub sfotografuj kartę papierową w DocPilot.
2. Uruchom OCR.
3. Sprawdź rozpoznane wiersze.
4. Wyeksportuj dane jako CSV lub JSON.
5. W Aktywnik+ przejdź do **Szkoła → Skan / import karty papierowej**.
6. Wybierz klasę i wpisz dziecko / identyfikator.
7. Wczytaj plik albo wklej tekst OCR.
8. Kliknij **Pokaż podgląd**.
9. Popraw ewentualne błędy w tabeli.
10. Kliknij **Zapisz import**.

## Zalecany CSV

Separator: średnik.

```csv
Data;Aktywność;Czas;Wysiłek;Uwagi
2026-10-01;Judo;90;3;trening klubowy
2026-10-03;Spacer;45;1;z rodziną
```

Aktywnik+ rozumie również czas zapisany jako:
- `90`
- `90 min`
- `1:30`
- `1,5 h`
- `1 h 30 min`

## Zalecany JSON

```json
{
  "rows": [
    {
      "date": "2026-10-01",
      "activity": "Judo",
      "minutes": 90,
      "effort": 3,
      "note": "trening klubowy"
    }
  ]
}
```

Obsługiwane są także polskie nazwy pól, m.in. `data`, `aktywność`, `czas`, `wysiłek`, `uwagi`.

## Prywatność pilota

W aktualnym pilocie import działa lokalnie w przeglądarce nauczyciela. Aktywnik+ nie wysyła zeskanowanej kartki do zewnętrznej usługi OCR.

Najbezpieczniejszy przepływ dla pilota:
- OCR lokalnie w DocPilot;
- do Aktywnik+ trafiają tylko rozpoznane wartości;
- nauczyciel zatwierdza je po podglądzie.

## Docelowa integracja

Po uruchomieniu backendu można dodać bezpośrednie przekazanie:
**DocPilot → Aktywnik+ School**
bez ręcznego zapisywania pliku, z kontrolą uprawnień, historią importu i audytem zmian.
