# Logowanie bez tarcia — Aktywnik+

## Pilot

Wersja pilotażowa działa **bez konta i bez hasła**.

Bezpośrednie wejścia:
- dziecko: `/app.html?mode=child`
- rodzic: `/app.html?mode=parent`
- nauczyciel: `/app.html?mode=school`

Aplikacja zapamiętuje ostatnio używany tryb na urządzeniu. Nazwa dziecka jest opcjonalna na starcie i może zostać uzupełniona później.

## Wersja synchronizowana

Celem jest brak klasycznych haseł tam, gdzie nie są potrzebne.

### Dziecko
- bez własnego e-maila;
- bez klasycznego hasła;
- profil dziecka tworzony przez rodzica;
- opcjonalny lokalny PIN tylko do oddzielenia panelu dziecka od panelu rodzica na wspólnym urządzeniu.

### Rodzic
Preferowana kolejność:
1. passkey / biometria urządzenia;
2. magic link wysłany na e-mail;
3. ewentualnie logowanie Google/Apple.

Konto rodzica jest potrzebne dopiero do:
- synchronizacji między urządzeniami;
- kopii chmurowej;
- połączenia z prawdziwą klasą szkolną.

### Nauczyciel
Preferowana kolejność:
1. szkolne Google Workspace / Microsoft 365 SSO;
2. magic link;
3. passkey.

Nie chcemy wymagać kolejnego hasła tylko dla Aktywnik+.

### Dołączanie do klasy
- rodzic otwiera link/QR otrzymany od nauczyciela;
- aplikacja zna już kod klasy z linku;
- rodzic potwierdza dziecko i zakres udziału;
- po uruchomieniu backendu zgłoszenie trafia do nauczyciela;
- kody mogą być rotowane i wygasać.

## Zasada

**Konto ma być potrzebne tylko wtedy, gdy daje realną korzyść: synchronizację, kopię lub współdzielenie.**
Zwykłe prowadzenie dziennika lokalnego pozostaje dostępne bez logowania.
