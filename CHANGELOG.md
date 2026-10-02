# Changelog

## 0.1.0 — Pilot

Pierwsza wersja przygotowana do pilota rodzinnego przed wdrożeniem backendu.

### Dziecko
- szybkie dodawanie aktywności;
- ulubione aktywności;
- czas, wysiłek i opcjonalna notatka;
- własne statystyki bez rankingów.

### Rodzic
- zatwierdzanie wpisów;
- raport miesięczny, kwartalny, półroczny i roczny;
- druk / zapis raportu jako PDF;
- eksport kopii danych do JSON;
- przywracanie kopii;
- możliwość usunięcia danych lokalnych;
- możliwość poproszenia przeglądarki o trwałą pamięć.

### Nauczyciel / szkoła
- lokalny prototyp klas;
- kod klasy jako demonstracja UX;
- tryb cyfrowy / hybrydowy / papierowy;
- plusy, oceny i uwagi według zasad nauczyciela;
- formularz papierowy;
- przygotowany model rodzinny, School SaaS i School Self-Hosted.

### PWA
- manifest;
- ikony 192 i 512;
- service worker i cache offline;
- instalacja z przeglądarki;
- osobna strona Pobierz / zainstaluj;
- instrukcje Android / iPhone / komputer.

### Prywatność
- dane pilota pozostają lokalnie na urządzeniu;
- brak GPS, masy ciała, kalorii i rankingów;
- publiczna strona prywatności pilota;
- dokumentacja ról, danych i modeli wdrożenia.

### Testy
- browser smoke test;
- automatyczny workflow GitHub Actions;
- lokalny pełny test PWA/service worker;
- CI sprawdza składnię, manifest, cache assets i scenariusz użytkownika.

### Jeszcze nie w 0.1.0
- prawdziwe konta;
- synchronizacja między telefonami;
- centralna klasa;
- backend;
- produkcyjna baza danych;
- automatyczna wymiana danych nauczyciel–rodzic.
