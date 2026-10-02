# Role i uprawnienia

Aktywnik+ stosuje zasadę najmniejszych potrzebnych uprawnień.

## Dziecko

Może:
- dodawać własne aktywności;
- edytować własny wpis do czasu zatwierdzenia;
- zarządzać ulubionymi aktywnościami;
- widzieć własne statystyki, plusy i oceny.

Nie może:
- zatwierdzać własnych wpisów;
- widzieć innych dzieci;
- zmieniać ustawień szkoły lub klasy.

## Rodzic / opiekun

Może:
- zarządzać przypisanym profilem dziecka;
- zatwierdzać, poprawiać i odrzucać wpisy;
- dołączyć dziecko do klasy kodem;
- generować raporty;
- widzieć historię decyzji nauczyciela dotyczącą swojego dziecka.

Nie może:
- przeglądać innych dzieci z klasy;
- zmieniać szkolnych zasad oceniania.

## Nauczyciel

Może:
- tworzyć i prowadzić swoje klasy;
- akceptować zgłoszenia do klasy;
- widzieć raporty dzieci w przypisanych klasach;
- zmieniać status raportu;
- zapisywać plusy, oceny i uwagi;
- ustalać reguły dla swoich klas w granicach ustawień szkoły.

Nie może:
- widzieć klas, do których nie został przypisany;
- zarządzać kontami technicznymi całej szkoły.

## Administrator szkoły

Może:
- tworzyć strukturę szkoły i lata szkolne;
- przypisywać nauczycieli do klas;
- ustalać domyślne zasady szkoły;
- archiwizować klasy;
- zarządzać retencją i eksportem danych organizacji;
- przeglądać dziennik audytowy.

Dostęp do szczegółowych danych aktywności uczniów nie musi być automatyczny. Powinien wynikać z konkretnego uprawnienia.

## Administrator techniczny Aktywnik+

Może:
- zarządzać infrastrukturą;
- sprawdzać stan usług;
- wykonywać operacje serwisowe bez podglądu treści uczniów.

Dostęp awaryjny do danych:
- wyłącznie gdy jest konieczny;
- na określony czas;
- z podaniem powodu;
- zapisany w audycie;
- możliwy do późniejszego sprawdzenia przez szkołę.

## Macierz

| Zasób | Dziecko | Rodzic | Nauczyciel | Admin szkoły | Admin usługi |
| --- | --- | --- | --- | --- | --- |
| własne aktywności | zapis/odczyt | odczyt/akceptacja | odczyt w klasie | wg uprawnienia | brak domyślnie |
| inne dzieci | nie | nie | tylko własne klasy | wg uprawnienia | brak domyślnie |
| raporty | własne | własnego dziecka | własne klasy | wg uprawnienia | brak domyślnie |
| plusy/oceny | odczyt | odczyt | zapis | wg uprawnienia | brak |
| klasy | odczyt przypisania | odczyt przypisania | zarządzanie własnymi | zarządzanie szkołą | brak |
| konfiguracja szkoły | nie | nie | częściowo | tak | techniczna |
| audyt | nie | własne zdarzenia opcjonalnie | ograniczony | tak | techniczny |
