# Zarządzanie danymi i prywatność

Ten dokument opisuje docelowy model produktu. Nie zastępuje analizy prawnej konkretnej szkoły ani ustaleń z jej IOD.

## Szkolny SaaS

W szkolnym wdrożeniu szkoła zarządza swoją przestrzenią danych i określa szkolne zasady korzystania z systemu.

Aktywnik+ jako dostawca techniczny:
- przechowuje dane zgodnie z konfiguracją i umową;
- zapewnia izolację szkół;
- realizuje kopie bezpieczeństwa;
- prowadzi techniczny audyt;
- nie wykorzystuje danych uczniów do reklam, profilowania ani budowania rankingów;
- nie uzyskuje zwykłego dostępu do treści uczniów.

Relacja szkoła–dostawca powinna zostać formalnie uregulowana przed wdrożeniem produkcyjnym.

## Minimalizacja danych

Domyślnie potrzebujemy tylko:
- technicznego identyfikatora użytkownika;
- nazwy wyświetlanej dziecka lub identyfikatora przyjętego przez szkołę;
- przypisania do klasy;
- wpisów aktywności;
- potwierdzeń rodzica;
- raportów;
- plusów, ocen i uwag, jeśli szkoła używa tych funkcji.

Nie wymagamy:
- adresu zamieszkania;
- dokładnej lokalizacji GPS;
- daty urodzenia, jeśli nie jest potrzebna;
- masy ciała;
- kalorii;
- zdjęcia twarzy;
- danych zdrowotnych.

## Izolacja szkół

Każdy rekord szkolny ma `tenant_id`.

Zapytanie użytkownika szkolnego jest dozwolone wyłącznie, gdy:
1. użytkownik ma aktywne członkostwo w danym tenant;
2. jego rola pozwala na daną operację;
3. w przypadku nauczyciela — jest przypisany do odpowiedniej klasy.

Reguły muszą być egzekwowane po stronie bazy/backendu, a nie tylko interfejsu.

## Retencja

Retencja jest konfigurowana przez szkołę.

Przykładowy cykl:
- aktywna klasa — dane dostępne bieżąco;
- zakończenie roku — klasa przechodzi do archiwum;
- po okresie ustalonym przez szkołę — eksport lub usunięcie;
- logi techniczne mają osobny, krótszy okres przechowywania.

Aktywnik+ nie powinien przechowywać danych uczniów „na zawsze” bez powodu.

## Eksport i usunięcie

Administrator szkoły powinien móc:
- wyeksportować dane szkoły;
- wyeksportować dane konkretnego dziecka;
- zarchiwizować rok szkolny;
- uruchomić usunięcie zgodnie z polityką szkoły;
- zobaczyć status operacji.

W trybie rodzinnym analogiczne uprawnienia ma rodzic.

## Audyt

Rejestrujemy działania administracyjne:
- utworzenie/usunięcie klasy;
- przypisanie nauczyciela;
- zaakceptowanie dziecka;
- zmianę konfiguracji;
- przyznanie lub zmianę plusa/oceny;
- eksport;
- usunięcie;
- wyjątkowy dostęp serwisowy.

Audyt zapisuje identyfikator wykonującego, czas, typ operacji i zasób. Nie powinien kopiować całej treści aktywności do logu.

## Dostęp serwisowy „break glass”

Administrator techniczny nie ma stałego wglądu w dane uczniów.

Jeżeli diagnoza awarii wymaga dostępu:
1. dostęp jest uruchamiany świadomie;
2. podawany jest powód;
3. ma określony czas wygaśnięcia;
4. każde użycie jest logowane;
5. po zakończeniu dostęp jest automatycznie cofany.

## Bezpieczeństwo

Docelowo:
- TLS dla transmisji;
- szyfrowanie danych i kopii zapasowych po stronie infrastruktury;
- MFA co najmniej dla administratorów i nauczycieli;
- sesje z wygasaniem;
- polityka haseł lub logowanie bezhasłowe;
- rate limiting;
- kopie zapasowe z testem odtwarzania;
- monitoring zdarzeń bezpieczeństwa;
- oddzielne sekrety dla środowisk dev/test/prod.

## DPIA / ocena ryzyka

Przed produkcyjnym wdrożeniem szkolnym należy wykonać co najmniej formalny screening DPIA. Jeżeli analiza wskaże wysokie ryzyko, szkoła jako administrator wykonuje ocenę skutków przed rozpoczęciem przetwarzania.

## Tryb papierowy

Rodzic może pozostać przy papierowym dzienniku, jeśli szkoła dopuszcza taki wariant. Dziecko nie powinno być przez to gorzej traktowane. Dane papierowe nie muszą być przepisywane do systemu poza informacjami potrzebnymi nauczycielowi, np. statusem raportu, plusem lub oceną.
