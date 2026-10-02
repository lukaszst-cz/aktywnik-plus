# Aktywnik+ 0.2.0 — Family Roles Pilot

Wydanie 0.2.0 przebudowuje rodzinny pilot tak, aby dziecko korzystało niezależnie i nie mogło wejść do panelu rodzica ani szkoły jednym kliknięciem.

## Najważniejsze zmiany

- strefa rodzica chroniona lokalnym PIN-em;
- PIN haszowany PBKDF2 z losową solą;
- automatyczne blokowanie strefy rodzica z wyborem czasu blokady;
- możliwość zmiany PIN-u rodzica po podaniu obecnego PIN-u;
- jeden rodzic może prowadzić wiele profili dzieci;
- każde urządzenie ma jeden aktywny profil dziecka, którego zmiana wymaga strefy rodzica;
- wszystkie wpisy, timery, raporty, statystyki, plusy i oceny są przypisane do konkretnego dziecka;
- dziecko może edytować wpis oczekujący oraz poprawić wpis odrzucony;
- rodzic może zatwierdzić, poprawić albo odrzucić wpis z powodem;
- lokalna historia decyzji i korekt;
- per-dziecko można wymagać akceptacji rodzica albo włączyć automatyczne zatwierdzanie;
- panel szkoły jest ukryty przed dzieckiem i dostępny w pilocie tylko z odblokowanej strefy rodzica;
- automatyczna migracja danych 0.1.x do schematu 4;
- backup obejmuje wiele dzieci oraz historię akceptacji.

## Granica bezpieczeństwa pilota

PIN 0.2.0 zabezpiecza interfejs na jednym urządzeniu. Nie zastępuje kont serwerowych i nie chroni przed osobą z technicznym dostępem do lokalnego profilu przeglądarki.

Docelowa wersja między urządzeniami wymaga:
- osobnych kont rodzic/dziecko/nauczyciel;
- jednorazowego kodu lub QR do parowania dziecka;
- backendu z Row Level Security;
- audytu operacji i synchronizacji.

Zobacz: [Rodzina, urządzenia i synchronizacja](FAMILY-SYNC.md).

## Testy

0.2.0 ma testy przeglądarkowe obejmujące:
- izolację ról;
- wielu profili dzieci;
- edycję i ponowne wysłanie;
- korektę i odrzucenie przez rodzica;
- historię decyzji;
- migrację starego formatu;
- backup i podstawy PWA.
