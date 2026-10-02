# Aktywnik+ 0.4.0 — Universal

## Cel wydania

0.4.0 otwiera Aktywnik+ poza samym scenariuszem dziecko–rodzic. Aplikacja nadal zachowuje rodzinny workflow, ale może być używana również jako prosty, lokalny tracker aktywności przez jedną osobę.

## Najważniejsze zmiany

### Dla siebie
- onboarding pozwala wybrać **Dla siebie** albo **Rodzina**;
- tryb osobisty nie wymaga PIN-u rodzica;
- wpisy w trybie osobistym zapisują się od razu;
- można wpisać własną nazwę aktywności;
- lista zawiera także aktywności przydatne starszym użytkownikom;
- dostępne są statystyki, eksport CSV, kopia JSON, przywracanie danych i trwała pamięć przeglądarki.

### Rodzina
- dotychczasowy model dziecko + rodzic pozostaje bez zmian;
- wiele profili dzieci, zatwierdzanie, korekty, odrzucenia, audyt i raporty nadal działają;
- strefa rodzica pozostaje chroniona lokalnym PIN-em.

### Dostępność
- link „Przejdź do treści”;
- większe cele dotykowe;
- czytelne focus states;
- obsługa `prefers-reduced-motion`;
- formularze mają bardziej ogólne i neutralne opisy.

### Dane
- schema danych i kopii: **6**;
- nowe pole `profileMode` przyjmuje `self` albo `family`;
- starsze dane bez tego pola migrują do `family`;
- cache PWA został podniesiony.

## Nadal poza zakresem 0.4.0

- produkcyjna synchronizacja między urządzeniami;
- produkcyjne konta dziecka, rodzica i nauczyciela;
- chmurowy backup;
- Web Push;
- produkcyjne klasy szkolne;
- pełna lokalizacja PL/EN.

Te elementy wymagają uruchomienia backendu, autoryzacji i testów RLS. Backend pozostaje fail-closed do czasu zakończenia tych prac.

## Zasada produktu

Aktywnik+ ma pozostać prosty i spokojny:
- bez rankingów użytkowników;
- bez kalorii, masy ciała i oceniania wyglądu;
- bez obowiązkowych celów i serii;
- lokalne korzystanie bez konta pozostaje podstawową opcją.
