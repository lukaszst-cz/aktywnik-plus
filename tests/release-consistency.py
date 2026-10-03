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
i18n = (ROOT / "i18n.js").read_text(encoding="utf-8")
release = ROOT / "docs" / f"RELEASE-{version}.md"
app = (ROOT / "app.js").read_text(encoding="utf-8")
personal_sync = (ROOT / "sync-client.js").read_text(encoding="utf-8")
family_sync = (ROOT / "family-sync-client.js").read_text(encoding="utf-8")

# Child-only movement-energy hint must remain presentation-only.
assert "childMovementEnergyText" in app, "child movement energy hint missing"
assert "kcal" not in app.lower(), "calorie counting must not be introduced into the child UI"
assert "childMovementEnergy" not in personal_sync, "child movement energy leaked into personal sync"
assert "childMovementEnergy" not in family_sync, "child movement energy leaked into family sync"
export_section = app.split("function exportReportCsv()",1)[1].split("function renderFavoritesEditor()",1)[0]
assert "childMovementEnergy" not in export_section, "child movement energy leaked into teacher/self exports or reports"

assert version in readme, "README does not expose current version"
assert "0.5.0 beta.4" in landing, "landing does not expose beta.4"
assert "0.5.0 beta.4" in i18n, "i18n does not expose beta.4"
assert release.exists(), f"missing release notes: {release.name}"

stale = [
    "Pełny sync rodzinnych aktywności między urządzeniami jest kolejnym etapem.",
    "Full family activity sync across devices is a later stage.",
    "Do produkcji pozostają m.in. family sync",
]
for phrase in stale:
    assert phrase not in landing + i18n, f"stale family-sync copy remains: {phrase}"

print(f"release consistency OK: {version}")
