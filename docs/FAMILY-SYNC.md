# Rodzina, urządzenia i synchronizacja

## Cel

Docelowa wersja Aktywnik+ ma pozwalać, aby dziecko korzystało ze swojego telefonu niezależnie, a rodzic zatwierdzał wpisy na własnym urządzeniu. Jeden rodzic może mieć wiele dzieci.

## Model rodzinny

1. Rodzic zakłada konto.
2. Rodzic tworzy jeden lub więcej profili dzieci.
3. Dla każdego dziecka może wygenerować jednorazowy kod lub QR.
4. Kod/QR paruje konkretne konto lub urządzenie dziecka wyłącznie z jego profilem.
5. Dziecko po zalogowaniu widzi tylko swój profil.
6. Rodzic widzi wszystkie przypisane dzieci i przełącza się między nimi w swojej strefie.
7. Zmiana przypisania dziecka, usunięcie profilu, eksport i ustawienia bezpieczeństwa są operacjami rodzica.

## Role

### Dziecko
Może:
- dodawać aktywności;
- edytować wpis oczekujący;
- poprawić wpis odrzucony;
- widzieć własne wpisy, statystyki, plusy i oceny.

Nie może:
- zatwierdzać własnych wpisów;
- wejść do strefy rodzica;
- przełączyć się na rodzeństwo;
- wejść do panelu nauczyciela lub szkoły;
- eksportować ani usuwać danych całej rodziny.

### Rodzic
Może:
- posiadać wiele profili dzieci;
- przeglądać każde przypisane dziecko osobno;
- zatwierdzić, poprawić lub odrzucić wpis;
- ustawić, czy dane dziecko wymaga akceptacji;
- sparować urządzenie dziecka;
- wygenerować raport i eksport;
- usunąć profil dziecka zgodnie z zasadami retencji.

### Nauczyciel
Ma osobne konto szkolne. Nie korzysta z PIN-u rodzica. Widzi tylko klasy, do których został przypisany i tylko zakres danych przewidziany dla szkoły.

## Parowanie dziecka

Kod/QR powinien:
- być jednorazowy;
- wygasać po krótkim czasie, np. 10–15 minut;
- być przechowywany w bazie wyłącznie jako skrót;
- wskazywać konkretne dziecko i rodzica tworzącego zaproszenie;
- po użyciu zostać oznaczony jako wykorzystany;
- nie zawierać danych dziecka w samym kodzie/QR.

## Sesje

Docelowo:
- sesja rodzica i nauczyciela ma wygasanie;
- dla rodzica można stosować MFA lub passkey;
- urządzenie dziecka otrzymuje wyłącznie uprawnienia do jednego profilu;
- cofnięcie dostępu urządzenia natychmiast blokuje kolejne operacje;
- wszystkie operacje autoryzacyjne są egzekwowane w backendzie/RLS, nie tylko w UI.

## Synchronizacja

### Protokół personal sync

Beta synchronizacja trybu osobistego używa jawnego `protocolVersion=1`.
Brak numeru jest chwilowo traktowany jako v1 dla zgodności podczas rolling deploy, ale klient/serwer odrzucają przyszłą, nieobsługiwaną wersję zamiast synchronizować dane „na ślepo”. Numer protokołu jest niezależny od `schemaVersion` lokalnego backupu.

Backend dodatkowo waliduje rzeczywistą datę kalendarzową wpisu oraz timestamp klienta. Timestamp może wyprzedzać zegar serwera najwyżej o 15 minut; większy skew jest odrzucany, żeby błędny zegar urządzenia nie „zamroził” konfliktów regułą nowszy-wygrywa.
Pojedynczy batch nie może też zawierać zduplikowanego ID wpisu, zduplikowanego tombstone'a ani jednocześnie aktualizacji i usunięcia tego samego ID.
Outbox trybu osobistego jest minimalny: nie przechowuje pełnego lokalnego stanu aplikacji, tylko dane wpisów potrzebne do synchronizacji. To ogranicza ilość danych lokalnych i sieciowych związanych z chmurą.

### Protokół family sync

Tryb rodzinny w 0.5 beta używa również `protocolVersion=1`, ale ma osobną kolejkę i endpoint `GET/POST /api/v1/family-sync`. Synchronizacja działa wyłącznie dla lokalnego profilu jawnie powiązanego z profilem chmurowym przez `cloudChildId` — aplikacja nie dopasowuje dzieci automatycznie po imieniu.

Synchronizowane są:
- aktywności i statusy `pending/approved/rejected`;
- usunięcia przez trwałe tombstones z regułą `deletedAt >= client_updated_at`;
- decyzje rodzica `approved/rejected/corrected/deleted` jako append-only historia.

Granice bezpieczeństwa:
- guardian widzi i synchronizuje wyłącznie dzieci z relacji `guardians`;
- konto dziecka nie dostaje rodzinnego DELETE;
- rodzinny wpis musi mieć `tenant_id IS NULL`, więc ścieżka rodzinna nie może usuwać ani modyfikować wpisów szkolnych;
- obcy dorosły nie widzi tombstones ani historii decyzji;
- klient wysyła minimalny payload, bez PIN-u, klas, ustawień szkoły i innych danych local-only;
- chmura pozostaje fail-closed, jeśli `AKTYWNIK_CLOUD_SYNC` lub weryfikacja RLS nie są aktywne.

Przepływ wpisu:

```
DZIECKO
  |
  | nowy wpis
  v
BACKEND / RLS
  |
  | status: pending
  v
RODZIC
  |
  +--> zatwierdź ------> approved
  +--> popraw ---------> corrected + approved
  +--> odrzuć ---------> rejected + powód
                              |
                              v
                         DZIECKO POPRAWIA
                              |
                              v
                            pending
```

Historia decyzji jest append-only: nowa decyzja tworzy kolejne zdarzenie, a nie nadpisuje poprzedniego.

## Wiele dzieci

Relacja rodzic–dziecko jest wiele-do-wielu:
- jeden rodzic może mieć wiele dzieci;
- jedno dziecko może mieć więcej niż jednego opiekuna;
- każdy opiekun widzi wyłącznie dzieci, do których ma relację `guardians`.

Raporty, aktywności, nagrody, klasy i historia akceptacji zawsze mają `child_id`.

## Obecny 0.5 beta vs dalszy School production

Obecny 0.5 beta:
- działa local-first również bez konta;
- ma opcjonalne konto dorosłego;
- obsługuje wiele profili dzieci;
- synchronizuje jawnie powiązane profile między urządzeniami;
- ma RLS, guardian-only family delete, tombstones i historię decyzji;
- zachowuje osobny model danych rodzinnych i szkolnych.

Dalszy School production:
- Web Push;
- produkcyjne parowanie urządzeń dziecka jednorazowym kodem/QR;
- możliwość cofnięcia sesji urządzenia;
- formalne uzgodnienia szkoła/IOD, retencja i ewentualne DPIA;
- niezależny pentest i produkcyjny test backup/restore platformy.
