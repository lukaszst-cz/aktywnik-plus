# Aktywnik+ 0.2.1 — Monthly report hardening

Wersja 0.2.1 domyka praktyczne użycie dziennika miesięcznego po stronie rodzica.

## Najważniejsze zmiany

- wybór konkretnego miesiąca odniesienia w raportach rodzica;
- raport miesięczny, kwartalny, półroczny i roczny liczony względem wybranego miesiąca;
- eksport CSV z miesiącem odniesienia w nazwie pliku;
- nowy wydruk **Dziennik A4 1–70+**;
- automatyczne wypełnienie wydruku wyłącznie zatwierdzonymi wpisami;
- 35 wpisów na stronę;
- automatyczne tworzenie kolejnych stron po przekroczeniu 70 wpisów;
- podsumowanie miesiąca na ostatniej stronie;
- miejsce na uwagi rodzica, nauczyciela / wychowawcy i plus / ocenę;
- odświeżony cache PWA, aby urządzenia pobierały nową wersję.

## Testy

GitHub Actions sprawdza:

- składnię JavaScript;
- kompletność zasobów PWA;
- formularz papierowy 70 wierszy;
- główny browser smoke test;
- wybór miesiąca i paginację wydruku A4;
- service worker, cache i manifest;
- podstawowe endpointy backendu oraz tryb fail-closed.

## Status

**0.2.1 Family Roles Pilot** — wersja gotowa do dalszego pilota rodzinnego. Dane nadal pozostają lokalnie na urządzeniu, a synchronizacja między urządzeniami i prawdziwe role szkolne wymagają backendu.
