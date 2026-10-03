#!/usr/bin/env python3
from pathlib import Path
import re
import sys

MIGRATIONS = Path("backend/migrations")
ALLOWED = {
    "create_class_invite",
    "create_guardian_child",
    "create_school_class",
    "decide_class_join",
    "request_class_join",
}

sql = "\n".join(
    path.read_text(encoding="utf-8")
    for path in sorted(MIGRATIONS.glob("*.sql"))
)

pattern = re.compile(
    r"create\s+or\s+replace\s+function\s+public\.([a-z0-9_]+)\s*"
    r"\((.*?)\)\s*returns\b.*?\bsecurity\s+definer\b.*?"
    r"\bas\s+\$\$(.*?)\$\$;",
    re.IGNORECASE | re.DOTALL,
)
matches = list(pattern.finditer(sql))
names = [match.group(1).lower() for match in matches]

if len(matches) != len(ALLOWED):
    raise SystemExit(
        f"SECURITY STATIC FAIL: expected {len(ALLOWED)} reviewed public "
        f"SECURITY DEFINER definitions, found {len(matches)}: {names}"
    )

if set(names) != ALLOWED:
    unexpected = sorted(set(names) - ALLOWED)
    missing = sorted(ALLOWED - set(names))
    raise SystemExit(
        "SECURITY STATIC FAIL: public SECURITY DEFINER allowlist changed; "
        f"unexpected={unexpected}, missing={missing}"
    )

for match in matches:
    name = match.group(1).lower()
    definition = match.group(0).lower()
    body = match.group(3).lower()

    if "set search_path = ''" not in definition:
        raise SystemExit(
            f"SECURITY STATIC FAIL: public.{name} must set an empty search_path"
        )
    if "auth.uid()" not in body:
        raise SystemExit(
            f"SECURITY STATIC FAIL: public.{name} must bind authorization to auth.uid()"
        )

    revoke_re = re.compile(
        rf"revoke\s+execute\s+on\s+function\s+public\.{re.escape(name)}"
        rf"\s*\([^;]+\)\s+from\s+public\s*,\s*anon\s*;",
        re.IGNORECASE | re.DOTALL,
    )
    grant_re = re.compile(
        rf"grant\s+execute\s+on\s+function\s+public\.{re.escape(name)}"
        rf"\s*\([^;]+\)\s+to\s+authenticated\s*;",
        re.IGNORECASE | re.DOTALL,
    )
    if not revoke_re.search(sql):
        raise SystemExit(
            f"SECURITY STATIC FAIL: public.{name} must revoke EXECUTE from PUBLIC and anon"
        )
    if not grant_re.search(sql):
        raise SystemExit(
            f"SECURITY STATIC FAIL: public.{name} reviewed authenticated EXECUTE grant missing"
        )


role_hardening = Path("backend/migrations/018_profile_type_role_hardening.sql").read_text(encoding="utf-8").lower()
if "revoke update on table public.profiles from authenticated" not in role_hardening:
    raise SystemExit("SECURITY STATIC FAIL: profiles table-wide UPDATE revoke missing")
if "grant update(display_name) on table public.profiles to authenticated" not in role_hardening:
    raise SystemExit("SECURITY STATIC FAIL: profiles display_name-only UPDATE grant missing")
if "grant update on table public.profiles to authenticated" in role_hardening:
    raise SystemExit("SECURITY STATIC FAIL: broad profiles UPDATE grant reintroduced")

print(
    f"security static PASS: exactly {len(ALLOWED)} reviewed public SECURITY DEFINER RPCs; "
    "empty search_path, auth.uid() checks and explicit EXECUTE grants verified"
)
