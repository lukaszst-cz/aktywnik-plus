# Security policy

Aktywnik+ jest obecnie bezpłatnym projektem pilotażowym. Wersja 0.1.0 nie ma produkcyjnego backendu ani centralnej bazy danych dzieci.

## Najważniejsze zasady

- Nie umieszczaj prawdziwych danych dzieci w issue, pull requestach, logach ani publicznych plikach repozytorium.
- Nie commituj haseł, tokenów, kluczy API, plików `.env`, dumpów baz ani kopii danych użytkowników.
- Dane demonstracyjne muszą być fikcyjne.
- W przypadku wykrycia podatności nie publikuj przykładowych danych użytkowników.

## Zgłaszanie problemu bezpieczeństwa

Jeżeli repozytorium udostępnia prywatne zgłaszanie podatności GitHub, użyj tej ścieżki. W przeciwnym razie skontaktuj się prywatnie z właścicielem repozytorium zamiast publikować szczegóły podatności wraz z danymi użytkowników w publicznym issue.

## Wersja pilota

W 0.1.0:
- dane użytkownika są lokalne w przeglądarce;
- nie ma logowania produkcyjnego;
- nie ma synchronizacji między urządzeniami;
- nie ma centralnej bazy uczniów.

Przed Aktywnik+ School wymagane będą osobne testy bezpieczeństwa backendu, autoryzacji, izolacji tenantów, retencji, backupów oraz obsługi incydentów.
