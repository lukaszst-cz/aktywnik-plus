from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
version = (ROOT / "VERSION").read_text(encoding="utf-8").strip()
assert version == "0.5.0-beta.4", f"unexpected VERSION: {version}"

health = (ROOT / "api" / "health.js").read_text(encoding="utf-8")
m = re.search(r"version:'([^']+)'", health)
assert m, "api/health.js version missing"
assert m.group(1) == version, f"health version {m.group(1)} != VERSION {version}"
assert "full-family-sync-pilot" in health, "health backend stage is stale"

readme = (ROOT / "README.md").read_text(encoding="utf-8")
landing = (ROOT / "index.html").read_text(encoding="utf-8")
app_html = (ROOT / "app.html").read_text(encoding="utf-8")
about = (ROOT / "o-projekcie.html").read_text(encoding="utf-8")
faq = (ROOT / "faq.html").read_text(encoding="utf-8")
download = (ROOT / "pobierz.html").read_text(encoding="utf-8")
privacy = (ROOT / "prywatnosc.html").read_text(encoding="utf-8")
i18n = (ROOT / "i18n.js").read_text(encoding="utf-8")
release = ROOT / "docs" / f"RELEASE-{version}.md"
app = (ROOT / "app.js").read_text(encoding="utf-8")
personal_sync = (ROOT / "sync-client.js").read_text(encoding="utf-8")
family_sync = (ROOT / "family-sync-client.js").read_text(encoding="utf-8")

# Parent-only movement-load hint must stay outside child UI, exports and sync.
assert "parentMovementLoadText" in app, "parent movement load hint missing"
assert "kcal" not in app.lower(), "calorie counting must not be introduced"
child_section = app.split("function renderChildEntries()",1)[1].split("function renderChildRewards()",1)[0]
assert "parentMovementLoad" not in child_section, "parent movement load leaked into child UI"
assert "parentMovementLoad" not in personal_sync, "parent movement load leaked into personal sync"
assert "parentMovementLoad" not in family_sync, "parent movement load leaked into family sync"
export_section = app.split("function exportReportCsv()",1)[1].split("function renderFavoritesEditor()",1)[0]
assert "parentMovementLoad" not in export_section, "parent movement load leaked into teacher/self exports or reports"

assert version in readme, "README does not expose current version"
assert "0.5.0 beta.4" in landing, "landing does not expose beta.4"
assert "0.5.0 beta.4" in i18n, "i18n does not expose beta.4"
assert "0.5.0 beta.4" in app_html, "app version badge does not expose beta.4"
assert "Zmęczenie 1–5" in app_html, "fatigue scale is not aligned with the paper journal"
assert "activityEffortValue" in app_html, "fatigue scale selected value is not visible"
assert "0.5.0 beta.4" in about, "about page is stale"
assert "0.5.0 beta.4" in faq, "FAQ page is stale"
assert release.exists(), f"missing release notes: {release.name}"

stale = [
    "Pełny sync rodzinnych aktywności między urządzeniami jest kolejnym etapem.",
    "Full family activity sync across devices is a later stage.",
    "Do produkcji pozostają m.in. family sync",
]
stale += [
    "Synchronizacja rodzic–nauczyciel między różnymi telefonami będzie dostępna dopiero po uruchomieniu backendu.",
    "Prawdziwe klasy między urządzeniami uruchomimy dopiero z backendem i kontami.",
]
stale += [
    "Tryb rodzinny nadal działa local-first na jednym urządzeniu",
    "Tryb rodzinny nadal jest local-first, więc przed zmianą urządzenia wykonaj kopię JSON.",
    "finalnego family sync",
    "Obecna wersja Aktywnik+ nie ma centralnego konta ani bazy danych uczniów.",
]
for phrase in stale:
    assert phrase not in landing + i18n + app_html + about + faq + download + privacy, f"stale product copy remains: {phrase}"

print(f"release consistency OK: {version}")
