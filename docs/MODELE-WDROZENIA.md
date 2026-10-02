# Modele wdrożenia Aktywnik+

Aktywnik+ obsługuje trzy niezależne modele wdrożenia.

## 1. Rodzinny

Rodzic zakłada konto i prowadzi profil dziecka niezależnie od szkoły.

- dane należą do przestrzeni rodziny;
- szkoła nie ma dostępu do konta;
- rodzic może wygenerować PDF i przekazać go nauczycielowi;
- rodzic może usunąć konto i dane;
- dziecko korzysta z uproszczonego profilu przypisanego do rodzica.

## 2. Szkolny SaaS

Szkoła korzysta z Aktywnik+ jako usługi online.

- szkoła jest właścicielem organizacyjnej przestrzeni danych;
- szkoła ustala zasady klas, raportów, plusów i ocen;
- Aktywnik+ działa jako dostawca techniczny;
- każda szkoła ma osobny `tenant_id`;
- użytkownik nie może odczytać danych innej szkoły;
- dostęp serwisowy do danych uczniów jest domyślnie wyłączony;
- wyjątkowy dostęp serwisowy musi być czasowy, uzasadniony i zapisany w audycie.

W tym modelu szkoła co do zasady określa cele i sposób przetwarzania danych uczniów, a dostawca aplikacji realizuje usługę na jej zlecenie.

## 3. School Self-Hosted

Szkoła lub organ prowadzący uruchamia własną instancję Aktywnik+.

- baza danych znajduje się na infrastrukturze wybranej przez szkołę;
- szkoła kontroluje kopie zapasowe, retencję i dostęp techniczny;
- operator projektu może dostarczać kod i aktualizacje bez dostępu do danych uczniów;
- konfiguracja może działać całkowicie bez wspólnej bazy SaaS.

## Wspólne zasady

Niezależnie od wdrożenia:

- nie zbieramy GPS, masy ciała, kalorii ani danych o wyglądzie;
- nie prowadzimy rankingów między dziećmi;
- dane dziecka nie są publiczne;
- papierowa ścieżka pozostaje dostępna;
- nauczyciel widzi tylko klasy, do których jest przypisany;
- rodzic widzi tylko dzieci, do których ma uprawnienie;
- dziecko widzi tylko swój profil;
- działania administracyjne są rejestrowane.

## Wybór szkoły

Przy uruchomieniu szkoła wybiera:

`school_saas` — usługa hostowana przez Aktywnik+  
`school_self_hosted` — własna infrastruktura  
`family` — tryb rodzinny bez organizacji szkolnej
