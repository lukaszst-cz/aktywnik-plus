# Backup / restore — Aktywnik+

## Obecny poziom

### Dane lokalne
- eksport JSON;
- import JSON;
- eksport CSV/PDF;
- możliwość żądania trwałej pamięci przeglądarki;
- walidacja formatu i wersji kopii przed restore;
- starszy format lokalny nadal jest migrowany;
- kopia z nowszej, nieobsługiwanej wersji jest blokowana zamiast być cicho przycinana;
- CI wykonuje syntetyczny round-trip backup → walidacja → restore stanu;
- kopia v6 jest odrzucana, jeśli zawiera zduplikowane ID profili/wpisów albo rekord wskazujący na nieistniejący profil — dane nie są wtedy automatycznie przepinane do pierwszego dziecka.

### Dane chmurowe
Tryb osobisty beta synchronizuje wpisy z Supabase, ale synchronizacja **nie jest jeszcze traktowana jako pełny system backup/restore**.

### Zweryfikowany restore drill danych aplikacji — 2026-10-03

Wykonano na projekcie Supabase syntetyczny, transakcyjny round-trip zakończony `ROLLBACK`:

- profil dorosłego;
- tenant/szkoła + membership;
- rok szkolny + klasa + nauczyciel;
- dziecko + relacja opiekuna;
- powiązanie dziecka z klasą;
- aktywność rodzinna;
- raport + pozycja raportu;
- wpis osobisty.

Scenariusz: utworzenie danych → snapshot logiczny → kontrolowane usunięcie w kolejności zależności → restore w kolejności FK → walidacja integralności relacji i wartości → `ROLLBACK`.

**Wynik: PASS.** Test jest zapisany jako `backend/tests/application_restore_drill.sql`.

To potwierdza odtwarzalność relacyjnych danych aplikacji, ale nie zastępuje platformowego restore fizycznego backupu Supabase ani testu PITR/restore-to-new-project.

## Warunek uznania backend backup za zamknięty

Przed produkcyjnym wdrożeniem szkolnym należy:
1. potwierdzić aktywną politykę backupów projektu Supabase dla używanego planu;
2. wykonać próbę odtworzenia na danych syntetycznych lub środowisku testowym — ✅ restore danych aplikacji PASS; platformowy restore backupu nadal do wykonania;
3. zmierzyć RPO/RTO i zapisać wynik;
4. sprawdzić integralność kont, relacji tenant/klasa/dziecko i raportów — ✅ PASS w restore drill;
5. udokumentować osobę odpowiedzialną i częstotliwość testu restore.

Punkt pozostaje częściowo otwarty wyłącznie w zakresie platformowego backupu/restore Supabase, RPO/RTO tego procesu i testu operacyjnego na odseparowanym środowisku.
