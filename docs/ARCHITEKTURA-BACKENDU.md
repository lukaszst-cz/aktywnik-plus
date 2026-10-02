# Architektura backendu

## Cel

Backend Aktywnik+ ma obsłużyć rodzinę, szkolny SaaS i instalację self-hosted bez zmiany podstawowego modelu danych.

## Klucz: tenant

Każda szkoła ma rekord `tenant`.

Dane szkolne są zawsze powiązane z `tenant_id`. Tryb rodzinny używa osobnej przestrzeni rodzinnej i nie udostępnia danych szkole, dopóki rodzic nie przekaże raportu albo świadomie nie dołączy dziecka do klasy.

## Główne encje

- `users` — konta dorosłych i techniczne profile dziecka;
- `tenants` — szkoły/organizacje;
- `memberships` — rola użytkownika w szkole;
- `school_years` — lata szkolne;
- `classes` — klasy i kod dołączenia;
- `class_teachers` — przypisanie nauczycieli;
- `children` — minimalny profil dziecka;
- `guardians` — relacja wiele-do-wielu rodzic–dziecko;
- `child_accounts` — konto dziecka sparowane z jednym profilem;
- `pairing_codes` — jednorazowe, haszowane kody/QR do parowania urządzenia;
- `class_children` — udział dziecka w klasie i tryb digital/hybrid/paper;
- `activities` — wpisy aktywności;
- `activity_approval_events` — append-only historia utworzenia, edycji, akceptacji, korekty i odrzucenia;
- `reports` — raporty okresowe;
- `rewards` — plusy, oceny i uwagi nauczyciela;
- `audit_events` — działania administracyjne;
- `support_access_grants` — czasowy dostęp serwisowy.

## Zasady dostępu

Autoryzacja jest dwuetapowa:
1. tożsamość użytkownika;
2. polityka zasobu.

Przykład nauczyciela:
- ma członkostwo `teacher` w szkole;
- jest przypisany do klasy;
- może czytać raporty dzieci z tej klasy;
- nie może czytać innych klas.

Przykład rodzica:
- ma relację guardian–child;
- może widzieć i zatwierdzać aktywności tego dziecka;
- nie widzi listy całej klasy.

## Self-hosted

Kod backendu i migracje powinny być możliwe do uruchomienia z własną bazą PostgreSQL/Supabase-compatible.

Konfiguracja środowiska określa:
- adres bazy;
- dostawcę poczty;
- storage;
- domenę;
- politykę kopii zapasowych;
- sposób uwierzytelniania.

## SaaS

W SaaS jedna infrastruktura może obsługiwać wiele szkół, ale izolacja tenantów jest wymuszana w bazie (np. RLS), a nie filtrowaniem wyłącznie w kodzie frontendu.

## Środowiska

- `dev` — dane syntetyczne;
- `test` — dane syntetyczne;
- `prod` — dane produkcyjne.

Prawdziwe dane uczniów nie powinny trafiać do repozytorium, testów ani publicznych logów.


## Egzekwowanie ról

Plik `backend/migrations/004_family_rls.sql` zawiera szkic polityk Supabase RLS. Interfejs nie jest granicą bezpieczeństwa.

W produkcji:
- dziecko ma dostęp wyłącznie przez `child_accounts`;
- rodzic wyłącznie przez `guardians`;
- nauczyciel wyłącznie przez przypisanie `class_teachers`;
- zatwierdzony wpis może być czytelny dla nauczyciela tylko w przypisanej klasie;
- kod parowania jest jednorazowy, haszowany i wygasa;
- administracyjne modyfikacje szkoły powinny przechodzić przez kontrolowane endpointy/server actions, a nie bezpośredni zapis z klienta.


## Migracje rodzinne 0.2.0

- `backend/migrations/003_family_roles.sql` — konta dziecka, wiele dzieci na opiekuna, pairing codes i append-only historia decyzji;
- `backend/migrations/004_family_rls.sql` — rozszerzenie RLS dla dziecka, opiekuna i parowania urządzeń.

Migracje uruchamia się po `001_core.sql` i `002_supabase_rls.sql`.
