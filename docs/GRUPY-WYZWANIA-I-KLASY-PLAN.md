# Aktywnik+: grupy uczniów, wyzwania i późniejsze powiązanie z nauczycielem

Status: **propozycja architektury**, nie gotowa funkcja. Nie uruchamiać dla rzeczywistych dzieci bez testów bezpieczeństwa i zgód opiekunów.

## Dwa oddzielne pojęcia

- **Grupa aktywności**: dobrowolna grupa kolegów do wspólnych wyzwań, możliwa do założenia bez nauczyciela.
- **Klasa szkolna**: formalna przestrzeń szkoły z rolami nauczyciela i opiekuna, do której dostęp nadawany jest na podstawie uprawnień szkoły.

Nie przenosić automatycznie grupy do formalnej klasy. Nauczyciel może zgłosić przejęcie opieki nad grupą; uprawnienie musi zostać potwierdzone przez system szkoły i zaakceptowane zgodnie z zasadami prywatności dzieci.

## Rejestracja i dostęp

- Konto dorosłego poprzez Supabase; Magic Link, opcjonalne hasło lub Google OAuth po konfiguracji providerów.
- Dziecko bez obowiązkowego e-maila; profil zarządzany przez opiekuna, dostęp do konkretnego profilu za pomocą parowania urządzenia i sesji ograniczonej uprawnieniami.
- Grupy zakładają zalogowani członkowie, bez samodzielnego nadawania sobie ról nauczyciela czy administratora.
- Krótkotrwałe zaproszenie kodem/QR, dołączenie po zatwierdzeniu opiekuna, blokowanie i opuszczanie grupy.
- Nazwa pseudonimowa w grupie, brak upubliczniania e-maila, wieku, nazwiska i historii aktywności.

## Motywacja, nie presja

- Proponowane: zespołowe cele (np. wspólne 300 minut spaceru w tygodniu), odznaki za regularność i wspieranie innych, wyzwania dowolnych rodzajów ruchu.
- Porównania wyłącznie dobrowolne i zrozumiałe. Domyślnie wyświetlać postęp zespołu, a nie ranking pojedynczych dzieci.
- Brak publicznych danych o zdrowiu, poziomie zmęczenia, szczegółowych godzinach i trasach; brak zachęt do nadmiernego wysiłku.
- Możliwość opt-out, przerwy w wyzwaniu i ukrycia indywidualnych wyników bez kary.

## Docelowe ograniczenia po stronie backendu

- Supabase RLS dla grup, członków, zaproszeń, wyzwań, wyników i wniosków nauczycieli.
- Grupa nie daje uprawnień do prywatnego profilu dziecka ani danych innych rodzin.
- Serwer weryfikuje członkostwo i uprawnienia przed odczytem/zapisem.
- Nie pozwalać dzieciom na usuwanie cudzych danych, przyznawanie sobie ról nauczyciela ani przeglądanie profili poza własną grupą.
- Uczniowie mogą współtworzyć grupę, ale formalną klasę zakłada nauczyciel przypisany do konkretnej szkoły (patrz migracja 026).
- Dołączenie nauczyciela do grupy nie oznacza automatycznego udostępnienia wcześniejszych prywatnych wpisów.

## Offline i dwa urządzenia

- Lokalne zdarzenia aktywności zapisywane natychmiast, niezależnie od sieci.
- Kolejka synchronizacji z idempotentnymi identyfikatorami operacji, wyraźnym statusem i retry.
- Tworzenie zaproszeń i połączenie nowych kont wymagają sieci. Można offline przygotować szkic nazwy grupy i wyzwania.
- Usuwanie działa z tombstones, a konflikty muszą mieć określone reguły oraz widoczną opcję odzyskania danych.
- Eksport JSON i CSV, bezpieczny import nowego urządzenia i kontrola potencjalnych duplikatów.

## Etapy

1. Ustabilizować logowanie, wylogowanie, kopie JSON i synchronizację rodzinną.
2. Wdrożyć i przetestować tworzenie klas przez nauczyciela w jednej szkole.
3. Zbudować model grup i uprawnienia RLS na syntetycznych danych.
4. Wdrożyć dobrowolne grupowe wyzwania na dwóch urządzeniach.
5. Dodać kontrolowane powiązanie grupy z nauczycielem i formalną klasą.

## Warunki pilota

Testy z trzema rolami, dwiema rodzinami, dwiema szkołami i urządzeniem offline. Sprawdzić brak dostępu poprzecznego, poprawność przywracania danych, brak dublowania wpisów, wypisanie z grupy, cofnięcie zgody opiekuna oraz bezpieczne przejęcie grupy przez nauczyciela.
