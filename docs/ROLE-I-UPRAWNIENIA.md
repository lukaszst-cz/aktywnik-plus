# Role i uprawnienia

Aktywnik+ stosuje zasadę najmniejszych potrzebnych uprawnień.

## Dziecko

Może:
- dodawać własne aktywności;
- edytować wpis oczekujący;
- poprawić wpis odrzucony i wysłać go ponownie;
- zarządzać własnymi ulubionymi aktywnościami;
- widzieć wyłącznie własne statystyki, plusy i oceny.

Nie może:
- zatwierdzać własnych wpisów;
- wejść do strefy rodzica bez autoryzacji;
- przełączyć urządzenia na profil rodzeństwa;
- widzieć danych rodzeństwa;
- wejść do panelu szkoły/nauczyciela;
- eksportować lub usuwać danych całej rodziny.

## Rodzic / opiekun

Może:
- mieć wiele przypisanych profili dzieci;
- przełączać się między nimi wyłącznie we własnej strefie;
- ustawić profil dziecka aktywny na danym urządzeniu;
- zatwierdzać, poprawiać i odrzucać wpisy z podaniem powodu;
- ustawić dla każdego dziecka obowiązkową akceptację albo automatyczne zatwierdzanie;
- dołączyć wybrane dziecko do klasy kodem;
- generować raporty i eksporty osobno dla każdego dziecka;
- widzieć historię decyzji i korekt;
- zmieniać PIN i czas automatycznej blokady w pilocie lokalnym.

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


## Pilot 0.2.0 — granica zabezpieczenia PIN

W lokalnym pilocie PIN chroni interfejs strefy rodzica na jednym profilu przeglądarki. PIN jest przechowywany jako PBKDF2 + losowa sól i sesja rodzica automatycznie wygasa.

To nie zastępuje backendowej autoryzacji. Osoba z technicznym dostępem do storage przeglądarki może ominąć zabezpieczenia interfejsu. W produkcji role muszą być wymuszane przez konto użytkownika i RLS.

## Wiele dzieci

Relacja rodzic–dziecko jest wiele-do-wielu:
- jeden rodzic może prowadzić wiele dzieci;
- jedno dziecko może mieć więcej niż jednego opiekuna;
- wszystkie zasoby rodzinne mają `child_id`;
- rodzic nigdy nie widzi dziecka bez relacji `guardians`.
