# Backup / restore — Aktywnik+

## Obecny poziom

### Dane lokalne
- eksport JSON;
- import JSON;
- eksport CSV/PDF;
- możliwość żądania trwałej pamięci przeglądarki.

### Dane chmurowe
Tryb osobisty beta synchronizuje wpisy z Supabase, ale synchronizacja **nie jest jeszcze traktowana jako pełny system backup/restore**.

## Warunek uznania backend backup za zamknięty

Przed produkcyjnym wdrożeniem szkolnym należy:
1. potwierdzić aktywną politykę backupów projektu Supabase dla używanego planu;
2. wykonać próbę odtworzenia na danych syntetycznych lub środowisku testowym;
3. zmierzyć RPO/RTO i zapisać wynik;
4. sprawdzić integralność kont, relacji tenant/klasa/dziecko i raportów;
5. udokumentować osobę odpowiedzialną i częstotliwość testu restore.

Do tego czasu ten punkt pozostaje częściowo otwarty.
