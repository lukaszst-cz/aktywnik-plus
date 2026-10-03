# Procedura incydentów — Aktywnik+

## Cel

Szybkie ograniczenie skutków awarii lub podejrzenia naruszenia danych i zebranie informacji potrzebnych administratorowi danych do dalszej decyzji.

## Reakcja techniczna

1. Zarejestruj datę, godzinę, zakres i źródło zgłoszenia.
2. Nie kopiuj do ticketu zbędnych danych dzieci ani tokenów.
3. Jeśli problem dotyczy chmury, w pierwszej kolejności można wyłączyć `AKTYWNIK_CLOUD_SYNC` — aplikacja lokalna nadal działa.
4. Zachowaj logi i identyfikatory wdrożenia potrzebne do analizy.
5. Ustal, czy incydent dotyczy poufności, integralności lub dostępności danych.
6. Usuń przyczynę, odtwórz usługę i udokumentuj działania naprawcze.
7. Po zamknięciu wykonaj analizę przyczyny i dodaj test zapobiegający regresji.

## Naruszenie danych osobowych

Przy formalnym wdrożeniu szkolnym administrator danych ocenia, czy zdarzenie stanowi naruszenie ochrony danych osobowych oraz ryzyko dla praw i wolności osób. Jeżeli powstaje obowiązek zgłoszenia organowi nadzorczemu, RODO przewiduje zgłoszenie bez zbędnej zwłoki i — gdy jest to wykonalne — nie później niż 72 godziny od stwierdzenia naruszenia. Przy wysokim ryzyku może być wymagane również zawiadomienie osób, których dane dotyczą.

Decyzję o zgłoszeniu podejmuje administrator danych / IOD, nie aplikacja automatycznie.

## Minimalny rejestr incydentu

- identyfikator incydentu;
- data wykrycia i zamknięcia;
- opis techniczny;
- kategorie danych i przybliżony zakres;
- osoby/systemy dotknięte;
- ocena ryzyka;
- podjęte środki;
- decyzja administratora/IOD dotycząca zgłoszeń;
- działania zapobiegawcze.

## Źródła

- RODO, art. 33–34: https://eur-lex.europa.eu/eli/reg/2016/679/oj?locale=PL
- UODO: https://uodo.gov.pl/
