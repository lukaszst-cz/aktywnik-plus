# Security policy

Aktywnik+ 0.4.0 jest nadal wersją pilotażową. Aplikacja obsługuje tryb osobisty i rodzinny, ale produkcyjna synchronizacja chmurowa pozostaje wyłączona.

## Najważniejsze zasady

- Nie umieszczaj prawdziwych danych dzieci ani użytkowników w issue, pull requestach, logach ani publicznych plikach repozytorium.
- Nie commituj haseł, tokenów, kluczy API, plików `.env`, dumpów baz ani kopii danych użytkowników.
- Dane demonstracyjne muszą być fikcyjne.
- W przypadku wykrycia podatności nie publikuj przykładowych danych użytkowników.

## Zgłaszanie problemu bezpieczeństwa

Jeżeli repozytorium udostępnia prywatne zgłaszanie podatności GitHub, użyj tej ścieżki. W przeciwnym razie skontaktuj się prywatnie z właścicielem repozytorium zamiast publikować szczegóły podatności wraz z danymi użytkowników w publicznym issue.

## Wersja 0.4.0

- dane użytkownika są lokalne w przeglądarce;
- tryb **Dla siebie** nie wymaga konta ani PIN-u rodzica;
- tryb **Rodzina** chroni strefę rodzica lokalnym PIN-em PBKDF2 i automatyczną blokadą;
- lokalny PIN chroni interfejs, ale nie jest granicą bezpieczeństwa dla osoby z technicznym dostępem do profilu przeglądarki;
- nie ma jeszcze produkcyjnej synchronizacji między urządzeniami;
- backend i RLS pozostają fail-closed do czasu pełnej konfiguracji i testów;
- nie ma produkcyjnej centralnej bazy uczniów.

Przed włączeniem Aktywnik+ School lub synchronizacji wymagane są testy bezpieczeństwa backendu, autoryzacji, RLS, izolacji tenantów, retencji, backupów, odzyskiwania konta i obsługi incydentów.
