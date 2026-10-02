# Warunki krytyczne wersji pilotażowej Aktywnik+

Ten dokument opisuje warunki, które muszą być spełnione, aby obecny prototyp można było rozsądnie pokazać rodzicom i nauczycielom oraz przetestować w jednej klasie.

## Status tej wersji

Obecna wersja jest **bezpłatnym prototypem / pilotem projektu rodzicielskiego**.

Nie jest jeszcze:
- szkolnym systemem informatycznym;
- centralnym dziennikiem;
- usługą z kontami użytkowników;
- produkcyjnym SaaS;
- miejscem do przechowywania pełnej dokumentacji uczniów.

## 1. GitHub Pages tylko do strony i demo

GitHub Pages może służyć do:
- strony projektu;
- instrukcji;
- demonstracji PWA;
- udostępnienia formularza papierowego;
- pokazania działania interfejsu.

Nie powinien służyć do:
- logowania użytkowników i przesyłania haseł;
- centralnego przechowywania danych uczniów;
- produkcyjnej usługi SaaS;
- operacji na danych wymagających wysokiego poziomu poufności.

Docelowe konta i synchronizacja wymagają osobnego backendu.

## 2. Dane pilota pozostają lokalnie

W obecnym prototypie wpisy są zapisywane w pamięci przeglądarki urządzenia.

Warunki:
- aplikacja nie wysyła aktywności do GitHuba;
- każdy telefon/komputer ma osobny zestaw danych;
- nauczyciel nie ma centralnego panelu z urządzeń rodziców;
- wyczyszczenie danych przeglądarki może usunąć historię;
- przed ważnym podsumowaniem należy wygenerować raport lub wydruk.

Ta wersja nadaje się do sprawdzenia pomysłu i interfejsu, ale nie do trwałego szkolnego archiwum.

## 3. Minimum danych o dziecku

Na etapie pilota nie zbieramy więcej danych niż potrzeba.

Preferowane:
- imię + inicjał lub uzgodniony identyfikator;
- klasa tylko w raporcie przekazywanym nauczycielowi;
- aktywność, data, czas, opcjonalny wysiłek i uwaga.

Nie zbieramy:
- adresu;
- numeru telefonu dziecka;
- dokładnej lokalizacji;
- masy ciała;
- kalorii;
- danych medycznych;
- zdjęcia twarzy jako obowiązkowego elementu;
- publicznej listy dzieci.

## 4. Brak publicznych danych dzieci na GitHubie

Repozytorium jest publiczne.

Nigdy nie umieszczamy w nim:
- list klasy;
- prawdziwych raportów dzieci;
- plików z imionami i aktywnościami;
- eksportów bazy;
- danych logowania;
- sekretów i kluczy;
- kopii dokumentacji szkolnej.

Dane demonstracyjne muszą być fikcyjne.

## 5. Rola szkoły przed formalnym wdrożeniem

Jeżeli Aktywnik+ ma stać się rozwiązaniem używanym oficjalnie przez szkołę, przed rozpoczęciem centralnego przetwarzania danych szkoła powinna ustalić z dyrektorem i IOD:
- cel przetwarzania;
- podstawę prawną;
- zakres danych;
- role administratora i podmiotu przetwarzającego;
- retencję;
- zasady dostępu;
- sposób obsługi praw osób;
- potrzebę DPIA lub wyniku screeningu DPIA.

W polskich materiałach UODO szkoła jest co do zasady administratorem danych uczniów, gdy decyduje o celach i sposobach ich przetwarzania.

## 6. Dzieci wymagają podwyższonej ochrony

Interfejs i komunikaty powinny być:
- proste;
- zrozumiałe;
- odpowiednie do wieku;
- pozbawione ukrytych mechanizmów presji;
- bez rankingów pomiędzy dziećmi.

Nie stosujemy funkcji opartych na wyglądzie, wadze, kaloriach ani porównywaniu sprawności.

## 7. Papierowa alternatywa

Pilot musi zachować możliwość udziału bez aplikacji.

Rodzina może:
- korzystać z aplikacji;
- korzystać hybrydowo;
- prowadzić papierowy dziennik.

Brak korzystania z aplikacji nie powinien stawiać dziecka w gorszej sytuacji.

## 8. Plusy i oceny

Aplikacja:
- może zapamiętać plus lub ocenę;
- nie ustala sama regulaminu oceniania;
- nie narzuca przelicznika plusów na ocenę.

Decyzja należy do nauczyciela/szkoły.

## 9. Bez serwera nie ma prawdziwej wspólnej klasy

Kod klasy w obecnym prototypie działa lokalnie i służy do testowania UX.

Aby rodzic na swoim telefonie rzeczywiście dołączył do klasy widocznej na telefonie nauczyciela, potrzebne są:
- backend;
- konta;
- baza danych;
- synchronizacja;
- uprawnienia po stronie serwera/bazy.

To jest granica pomiędzy prototypem a wersją produkcyjną.

## 10. Warunki przejścia do wersji produkcyjnej

Przed uruchomieniem realnych kont szkolnych wymagane będą co najmniej:

1. backend produkcyjny;
2. uwierzytelnianie;
3. role i egzekwowanie uprawnień w bazie;
4. izolacja szkół (tenant);
5. szyfrowany transport HTTPS;
6. kopie zapasowe i test odtworzenia;
7. audyt działań administracyjnych;
8. polityka retencji i usuwania;
9. eksport danych;
10. informacja o prywatności;
11. uzgodnienie modelu ze szkołą/IOD;
12. screening DPIA i — jeśli wymagany — DPIA;
13. testy bezpieczeństwa;
14. procedura reagowania na incydenty;
15. środowisko testowe bez prawdziwych danych dzieci.

## 11. Warunek publikacji

Publiczny link do demo powinien jasno informować:

**Aktywnik+ — bezpłatny projekt rodzicielski w fazie pilotażowej. Obecna wersja demonstracyjna zapisuje dane lokalnie na urządzeniu i nie jest jeszcze szkolnym systemem informatycznym.**

## Źródła

- GitHub Pages — HTTPS i ostrzeżenie przed wrażliwymi transakcjami: https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https
- GitHub Pages — ograniczenia i brak przeznaczenia do produkcyjnego SaaS: https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits
- UODO — administrator danych w oświacie: https://uodo.gov.pl/file/1384
- EDPB — szczególna ochrona danych dzieci: https://www.edpb.europa.eu/topics/key-gdpr-concepts/children_en
