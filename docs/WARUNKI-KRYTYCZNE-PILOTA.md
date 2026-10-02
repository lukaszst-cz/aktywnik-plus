# Warunki krytyczne wersji pilotażowej Aktywnik+

Ten dokument pokazuje aktualny stan pilota i rozdziela:
- **✅ spełnione w obecnym pilocie**;
- **🟡 częściowo rozwiązane / przygotowane projektowo**;
- **🔴 wymagające backendu albo decyzji szkoły**.

## Status tej wersji

Aktywnik+ jest obecnie **bezpłatnym pilotem projektu rodzicielskiego**.

Nie jest jeszcze:
- szkolnym systemem informatycznym;
- centralnym dziennikiem;
- produkcyjnym SaaS z kontami i wspólną bazą;
- miejscem do przechowywania pełnej dokumentacji uczniów.

Publiczna wersja:
**https://aktywnik-plus.vercel.app**

## 1. Hosting publicznego pilota — ✅ spełnione

Pilot jest hostowany na Vercel, a nie na GitHub Pages.

Aktualnie:
- działa przez HTTPS;
- ma stały publiczny adres;
- ma Content-Security-Policy;
- ma HSTS;
- blokuje osadzanie w obcych iframe;
- nie prosi o hasła użytkowników;
- nie przechowuje centralnie danych dzieci;
- GitHub służy do kodu i dokumentacji.

Frontend pilota nadal nie jest backendem szkolnym.

## 2. Dane pilota pozostają lokalnie — 🟡 mocno ograniczone ryzyko

Wpisy są zapisane lokalnie w pamięci przeglądarki urządzenia.

Zrobione:
- eksport kopii do JSON;
- import kopii;
- przycisk prośby o trwałą pamięć przeglądarki;
- ręczne usunięcie danych lokalnych;
- raport PDF;
- eksport CSV;
- brak automatycznej wysyłki danych do GitHuba/Vercela;
- brak obowiązkowego logowania.

Pozostaje:
- dane są zależne od konkretnego urządzenia/profilu przeglądarki;
- skasowanie danych przeglądarki bez kopii może usunąć historię;
- nie ma jeszcze szyfrowanej kopii chmurowej.

## 3. Minimum danych o dziecku — ✅ spełnione

W pilocie preferowane są:
- imię + inicjał albo umówiony identyfikator;
- aktywność, data, czas;
- opcjonalny wysiłek i uwaga.

Nie wymagamy:
- adresu;
- telefonu dziecka;
- GPS;
- masy ciała;
- kalorii;
- danych medycznych;
- zdjęcia twarzy;
- publicznej listy klasy.

Nazwa dziecka może zostać pominięta przy starcie.

## 4. Brak publicznych danych dzieci w repo — ✅ spełnione jako zasada projektu

Publiczne repozytorium zawiera kod, dokumentację i dane demonstracyjne.

Nie wolno umieszczać:
- prawdziwej listy klasy;
- rzeczywistych raportów dzieci;
- eksportów z danymi dzieci;
- sekretów, tokenów i danych logowania;
- kopii dokumentacji szkolnej.

Testy używają danych syntetycznych.

## 5. Rola szkoły / dyrektora / IOD — 🟡 przygotujemy pakiet, decyzja pozostaje po stronie szkoły

Możemy przygotować:
- opis celu i zakresu pilota;
- mapę danych;
- listę ról;
- model dostępu;
- propozycję retencji;
- checklistę dla dyrektora/IOD;
- screening pytań do DPIA;
- opis dostawcy i hostingu.

Nie możemy za szkołę:
- wybrać podstawy prawnej;
- zatwierdzić modelu przetwarzania;
- zdecydować o DPIA;
- zatwierdzić formalnego wdrożenia.

## 6. Podwyższona ochrona dzieci — ✅ spełnione projektowo

Aktywnik+:
- nie tworzy rankingów dzieci;
- nie porównuje dzieci ze sobą;
- nie śledzi wagi, kalorii ani wyglądu;
- nie wymaga GPS;
- pokazuje prosty interfejs;
- statystyki dotyczą własnej historii dziecka;
- szybkie czasy treningu są zapisem faktycznych zajęć, a nie celem do „nabijania”.

## 7. Papierowa alternatywa — ✅ spełnione

Dostępne są:
- aplikacja;
- tryb hybrydowy;
- formularz papierowy;
- arkusz 70 wpisów;
- druk / zapis PDF;
- import papierowej karty po OCR/CSV/JSON.

Brak aplikacji nie blokuje udziału w programie.

## 8. Plusy i oceny — ✅ spełnione projektowo

Aktywnik+:
- może zapisać plus/ocenę;
- nie narzuca przelicznika;
- nie ustala sam zasad oceniania.

Reguły pozostają po stronie nauczyciela/szkoły.

## 9. Prawdziwa wspólna klasa — 🔴 wymaga backendu

Obecny kod klasy jest lokalnym demo UX.

Prawdziwe dołączanie między urządzeniami wymaga:
- backendu;
- bazy;
- synchronizacji;
- identyfikacji dorosłych;
- uprawnień po stronie serwera/bazy.

To pozostaje największą techniczną granicą pilota.

## 10. Warunki produkcyjne — stan bieżący

| Warunek | Stan |
| --- | --- |
| backend produkcyjny | 🟡 działa szkielet Vercel API; cloud sync celowo wyłączony do czasu bazy/auth |
| uwierzytelnianie | 🟡 model bez haseł zaprojektowany; Supabase Auth do podłączenia |
| role/uprawnienia | 🟡 migracje RLS + jawne GRANT-y + syntetyczny test izolacji gotowe; wymagane wykonanie w Supabase |
| izolacja szkół / tenant | 🟡 tenant_id + RLS + test cross-tenant gotowe; wymagane wykonanie w Supabase |
| HTTPS | ✅ działa na Vercel |
| kopie zapasowe | 🟡 lokalny eksport/import działa; brak backupu serwerowego |
| audyt administracyjny | 🟡 schema przewiduje audit_events; brak backendu |
| retencja/usuwanie | 🟡 opisane; lokalne usunięcie działa; brak polityki serwerowej |
| eksport danych | ✅ JSON / CSV / PDF |
| informacja o prywatności | ✅ publiczna strona |
| uzgodnienie ze szkołą/IOD | 🔴 decyzja szkoły |
| DPIA screening | 🔴 do wykonania przy formalnym wdrożeniu |
| testy bezpieczeństwa | 🟡 CI/smoke testy są; formalny security review przed produkcją |
| procedura incydentów | 🟡 dokument do przygotowania przed wdrożeniem szkolnym |
| środowisko testowe bez prawdziwych danych | ✅ dane syntetyczne |

## 11. Warunek publikacji — ✅ spełnione

Publiczny pilot jasno komunikuje, że:
- jest bezpłatnym projektem rodzicielskim;
- działa bez konta;
- dane pilota są lokalne;
- nie jest jeszcze szkolnym systemem informatycznym.

## Backend — stan 0.2.x

Na produkcji działają:
- `/api/health`;
- `/api/capabilities`;
- chronione endpointy `/api/v1/classes` i `/api/v1/sync`.

Chronione endpointy zwracają `503 cloud_sync_disabled`, dopóki nie ma jednocześnie:
- bazy;
- autoryzacji;
- jawnego `AKTYWNIK_CLOUD_SYNC=true`;
- potwierdzonego `AKTYWNIK_RLS_VERIFIED=true`.

To oznacza, że backend już istnieje technicznie, ale nie przyjmuje danych szkolnych bez pełnej konfiguracji bezpieczeństwa.

## Najważniejsze nierozwiązane rzeczy

Do przejścia z pilota do Aktywnik+ School pozostają przede wszystkim:
1. podłączenie produkcyjnej bazy Supabase/PostgreSQL;
2. synchronizacja między urządzeniami;
3. bezpieczne konta dorosłych;
4. wdrożenie i testy RLS;
5. backup/restore backendu;
6. audyt i retencja po stronie serwera;
7. formalne ustalenia ze szkołą/IOD;
8. DPIA screening;
9. security review.

## Źródła

- RODO: https://eur-lex.europa.eu/eli/reg/2016/679
- UODO: https://uodo.gov.pl/
- EDPB — dzieci: https://www.edpb.europa.eu/topics/key-gdpr-concepts/children_en
- Vercel — dokumentacja bezpieczeństwa i hostingu: https://vercel.com/docs
