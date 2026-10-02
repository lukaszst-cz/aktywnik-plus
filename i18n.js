(() => {
  "use strict";

  const STORAGE_KEY = "aktywnik_plus_lang";
  const supported = new Set(["pl", "en"]);

  const messages = {
    pl: {
      "lang.select": "Język",
      "common.install": "Zainstaluj",
      "app.skip": "Przejdź do treści",
      "app.tagline": "ruch bez presji",
      "app.localSession": "bez logowania · dane lokalne",
      "app.saveLocal": "zapis lokalny",
      "app.parentZone": "Strefa rodzica 🔒",
      "app.firstRun": "Pierwsze uruchomienie",
      "app.setupTitle": "Jak chcesz korzystać z Aktywnik+?",
      "app.setupIntro": "Wybierz prosty tryb osobisty albo rodzinny. Funkcje szkoły i klubu są dodatkiem, nie warunkiem korzystania.",
      "app.modeLabel": "Tryb korzystania",
      "app.modeSelf": "Dla siebie — bez zatwierdzania przez rodzica",
      "app.modeFamily": "Rodzina — dziecko + rodzic/opiekun",
      "app.profileName": "Nazwa profilu",
      "app.profilePlaceholder": "np. Łukasz albo Daniel S.",
      "app.parentPin": "PIN rodzica",
      "app.repeatPin": "Powtórz PIN",
      "app.pinPlaceholder": "4–8 cyfr",
      "app.repeatPinPlaceholder": "powtórz PIN",
      "app.start": "Zacznij korzystać",
      "app.setupHint": "Tryb osobisty działa lokalnie bez konta. Dane możesz później eksportować jako kopię.",
      "app.today": "Dzisiaj",
      "app.whatDid": "Co robiłeś/aś?",
      "app.chooseActivity": "Wybierz ulubioną aktywność albo znajdź inną.",
      "app.minToday": "min dzisiaj",
      "app.quickView": "Szybki podgląd",
      "app.thisWeek": "Ten tydzień",
      "app.repeatLast": "Powtórz ostatnią aktywność",
      "app.calmSummary": "To tylko podsumowanie aktywności — bez celów, rankingów i porównywania z innymi.",
      "app.timerRunning": "Pomiar trwa",
      "app.activity": "Aktywność",
      "app.cancelTimer": "Anuluj pomiar",
      "app.stopSave": "■ Stop i zapisz",
      "app.timerHint": "Możesz zminimalizować lub zamknąć PWA. Czas jest liczony od zapisanego momentu startu.",
      "app.favorites": "⭐ Ulubione",
      "app.edit": "Edytuj",
      "app.allActivities": "Wszystkie aktywności",
      "app.search": "Szukaj aktywności",
      "app.newActivity": "Nowa aktywność",
      "app.date": "Data",
      "app.duration": "Czas (min)",
      "app.quickDuration": "Szybki czas zajęć",
      "app.durationHelp": "Wybierz rzeczywisty czas treningu albo wpisz własną liczbę minut. To zapis zajęć, nie cel do osiągnięcia.",
      "app.effort": "Wysiłek 1–5",
      "app.customName": "Własna nazwa aktywności (opcjonalnie)",
      "app.customPlaceholder": "np. trening siłowy, ogród, spacer po lesie",
      "app.note": "Notatka (opcjonalnie)",
      "app.notePlaceholder": "np. z rodziną, trening, rekreacyjnie",
      "app.cancel": "Anuluj",
      "app.startTimer": "▶ Start pomiaru",
      "app.saveManual": "Zapisz ręcznie",
      "app.recent": "Moje ostatnie wpisy",
      "app.rewards": "Moje plusy i oceny",
      "app.onlyMine": "tylko moje",
      "app.stats": "Moje statystyki",
      "app.month": "Miesiąc",
      "app.quarter": "Kwartał",
      "app.half": "Półrocze",
      "app.year": "Rok",
      "app.myData": "Moje dane",
      "app.local": "lokalnie",
      "app.myDataText": "W trybie osobistym możesz korzystać bez konta. Zapisz kopię przed zmianą urządzenia lub czyszczeniem przeglądarki.",
      "app.exportCsv": "Eksport CSV",
      "app.exportJson": "Eksport kopii JSON",
      "app.restore": "Przywróć kopię",
      "app.protect": "Chroń dane na urządzeniu",
      "app.delete": "Usuń dane",
      "app.storageStatus": "Dane są zapisane lokalnie w tej przeglądarce.",
      "landing.navHow": "Jak działa",
      "landing.navForWho": "Dla kogo",
      "landing.navAbout": "O projekcie",
      "landing.navFaq": "FAQ",
      "landing.navTeacher": "Dla nauczyciela",
      "landing.navDownload": "Pobierz / zainstaluj",
      "landing.navPaper": "Wersja papierowa",
      "landing.pill": "Bezpłatny tracker aktywności • pilot 0.4.0",
      "landing.title": "Aktywność zapisana prosto.",
      "landing.intro": "Aktywnik+ pozwala mierzyć czas Start/Stop albo dodać wpis ręcznie. Możesz korzystać samodzielnie lub rodzinnie, a funkcje szkoły i klubu są dodatkowym modułem.",
      "landing.start": "Zacznij — dla siebie lub rodziny",
      "landing.teacher": "Dla nauczyciela / szkoły",
      "landing.download": "Pobierz / zainstaluj",
      "landing.account": "Konta online — planowane",
      "landing.paper": "Pobierz wersję papierową"
    },
    en: {
      "lang.select": "Language",
      "common.install": "Install",
      "app.skip": "Skip to content",
      "app.tagline": "movement without pressure",
      "app.localSession": "no sign-in · local data",
      "app.saveLocal": "local save",
      "app.parentZone": "Parent zone 🔒",
      "app.firstRun": "First launch",
      "app.setupTitle": "How do you want to use Aktywnik+?",
      "app.setupIntro": "Choose a simple personal or family mode. School and club features are optional extras, not a requirement.",
      "app.modeLabel": "Usage mode",
      "app.modeSelf": "For myself — no parent approval",
      "app.modeFamily": "Family — child + parent/guardian",
      "app.profileName": "Profile name",
      "app.profilePlaceholder": "e.g. Alex or Daniel S.",
      "app.parentPin": "Parent PIN",
      "app.repeatPin": "Repeat PIN",
      "app.pinPlaceholder": "4–8 digits",
      "app.repeatPinPlaceholder": "repeat PIN",
      "app.start": "Start using",
      "app.setupHint": "Personal mode works locally without an account. You can export a backup later.",
      "app.today": "Today",
      "app.whatDid": "What did you do?",
      "app.chooseActivity": "Choose a favorite activity or find another one.",
      "app.minToday": "min today",
      "app.quickView": "Quick view",
      "app.thisWeek": "This week",
      "app.repeatLast": "Repeat last activity",
      "app.calmSummary": "This is only an activity summary — no goals, rankings or comparisons with others.",
      "app.timerRunning": "Timer running",
      "app.activity": "Activity",
      "app.cancelTimer": "Cancel timer",
      "app.stopSave": "■ Stop and save",
      "app.timerHint": "You can minimize or close the PWA. Time is measured from the saved start moment.",
      "app.favorites": "⭐ Favorites",
      "app.edit": "Edit",
      "app.allActivities": "All activities",
      "app.search": "Search activities",
      "app.newActivity": "New activity",
      "app.date": "Date",
      "app.duration": "Duration (min)",
      "app.quickDuration": "Quick duration",
      "app.durationHelp": "Choose the actual activity duration or enter your own number of minutes. This records activity; it is not a target.",
      "app.effort": "Effort 1–5",
      "app.customName": "Custom activity name (optional)",
      "app.customPlaceholder": "e.g. strength training, gardening, forest walk",
      "app.note": "Note (optional)",
      "app.notePlaceholder": "e.g. with family, training, recreation",
      "app.cancel": "Cancel",
      "app.startTimer": "▶ Start timer",
      "app.saveManual": "Save manually",
      "app.recent": "My recent entries",
      "app.rewards": "My pluses and grades",
      "app.onlyMine": "only mine",
      "app.stats": "My statistics",
      "app.month": "Month",
      "app.quarter": "Quarter",
      "app.half": "Half-year",
      "app.year": "Year",
      "app.myData": "My data",
      "app.local": "local",
      "app.myDataText": "In personal mode you can use the app without an account. Save a backup before changing devices or clearing browser data.",
      "app.exportCsv": "Export CSV",
      "app.exportJson": "Export JSON backup",
      "app.restore": "Restore backup",
      "app.protect": "Protect data on device",
      "app.delete": "Delete data",
      "app.storageStatus": "Data is stored locally in this browser.",
      "landing.navHow": "How it works",
      "landing.navForWho": "Who it is for",
      "landing.navAbout": "About",
      "landing.navFaq": "FAQ",
      "landing.navTeacher": "For teachers",
      "landing.navDownload": "Download / install",
      "landing.navPaper": "Paper version",
      "landing.pill": "Free activity tracker • pilot 0.4.0",
      "landing.title": "Activity tracking made simple.",
      "landing.intro": "Aktywnik+ lets you measure time with Start/Stop or add an entry manually. Use it personally or with your family; school and club features are optional modules.",
      "landing.start": "Start — personal or family",
      "landing.teacher": "For teachers / schools",
      "landing.download": "Download / install",
      "landing.account": "Online accounts — planned",
      "landing.paper": "Download paper version"
    }
  };

  function getLanguage() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (supported.has(saved)) return saved;
    return (navigator.language || "").toLowerCase().startsWith("pl") ? "pl" : "en";
  }

  function applyLanguage(lang) {
    if (!supported.has(lang)) lang = "pl";
    document.documentElement.lang = lang;
    localStorage.setItem(STORAGE_KEY, lang);

    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      const value = messages[lang]?.[key];
      if (value != null) el.textContent = value;
    });

    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      const key = el.getAttribute("data-i18n-placeholder");
      const value = messages[lang]?.[key];
      if (value != null) el.setAttribute("placeholder", value);
    });

    document.querySelectorAll("[data-language-switch]").forEach((el) => {
      el.value = lang;
      el.setAttribute("aria-label", messages[lang]["lang.select"]);
    });

    window.dispatchEvent(new CustomEvent("aktywnik:languagechange", { detail: { lang } }));
  }

  function init() {
    const lang = getLanguage();
    document.querySelectorAll("[data-language-switch]").forEach((el) => {
      el.addEventListener("change", (event) => applyLanguage(event.target.value));
    });
    applyLanguage(lang);
  }

  window.AktywnikI18n = { applyLanguage, getLanguage, messages };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
