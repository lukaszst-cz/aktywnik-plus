# Changelog

## 0.1.2 — Support & hardening

Aktualizacja stabilizująca publiczny pilot i ujednolicająca informacje o autorze.

### Nowe
- dobrowolne wsparcie „Postaw Naleśnikowi++ kawę” na stronie i w aplikacji;
- stały odnośnik do Zielonej Marki dla osób potrzebujących własnej strony lub prostego systemu;
- podpis autora na podstronach pilota bez ingerowania w wydruki.

### Poprawki
- blokada przyszłych dat przy zapisie aktywności;
- twarda walidacja czasu 1–600 minut;
- raporty ignorują wpisy z przyszłości;
- import kopii ma limit 2 MB i odrzuca wadliwe rekordy;
- dane odczytywane z localStorage przechodzą walidację;
- limity klas i zgłoszeń w lokalnym pilocie;
- blokada duplikatu dziecka dodawanego papierowo.

### Testy
- regresja importu uszkodzonej kopii;
- regresja przyszłych wpisów w raportach;
- dotychczasowe testy timera, akceptacji, klas, backupu i PWA pozostają aktywne.

## 0.1.1 — Pilot update

Aktualizacja przygotowująca Aktywnik+ do wygodniejszego testowania przez dziecko, rodzica i nauczyciela.

### Nowe
- Start/Stop aktywności dziecka z licznikiem czasu;
- timer przetrwa zminimalizowanie lub ponowne otwarcie PWA, ponieważ zapisuje moment rozpoczęcia;
- możliwość ręcznego wpisu pozostaje równolegle;
- sekcja „Gdzie działa Aktywnik+?”: przeglądarka, Android, iPhone/iPad, Windows, macOS, ChromeOS, Linux i wersja papierowa;
- dokładniejszy opis produktu;
- na kluczowych stronach wskazany jest twórca i właściciel projektu: Łukasz St‑cz;
- na kluczowych stronach dostępny jest link do repozytorium GitHub: https://github.com/lukaszst-cz/aktywnik-plus.

### Testy
- automatyczny test Start/Stop;
- test zachowania aktywnego timera po ponownym załadowaniu aplikacji;
- pełny lokalny smoke test PWA: service worker, cache, manifest, raporty i backup.


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
