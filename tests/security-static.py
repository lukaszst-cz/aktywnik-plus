#!/usr/bin/env python3
from pathlib import Path
import re

MIGRATIONS = Path("backend/migrations")
TARGETS = {
    "create_class_invite": "create_class_invite_secure",
    "create_guardian_child": "create_guardian_child_secure",
    "create_school_class": "create_school_class_secure",
    "decide_class_join": "decide_class_join_secure",
    "request_class_join": "request_class_join_secure",
}

files = sorted(MIGRATIONS.glob("*.sql"))
if not files:
    raise SystemExit("SECURITY STATIC FAIL: no migrations found")

function_re = re.compile(
    r"create\s+or\s+replace\s+function\s+"
    r"(?P<schema>[a-z0-9_]+)\.(?P<name>[a-z0-9_]+)\s*"
    r"\((?P<args>.*?)\)\s*returns\b(?P<tail>.*?)"
    r"\bas\s+\$\$(?P<body>.*?)\$\$;",
    re.IGNORECASE | re.DOTALL,
)

latest_public = {}
for path in files:
    sql = path.read_text(encoding="utf-8")
    for match in function_re.finditer(sql):
        if match.group("schema").lower() != "public":
            continue
        latest_public[match.group("name").lower()] = (path, match.group(0))

active_public_definers = []
for name, (path, definition) in sorted(latest_public.items()):
    lower = definition.lower()
    if re.search(r"\bsecurity\s+definer\b", lower):
        active_public_definers.append(f"{name}@{path.name}")

if active_public_definers:
    raise SystemExit(
        "SECURITY STATIC FAIL: latest public function definition(s) still SECURITY DEFINER: "
        + ", ".join(active_public_definers)
    )

migration_020 = Path("backend/migrations/020_public_rpc_invoker_wrappers.sql")
if not migration_020.exists():
    raise SystemExit("SECURITY STATIC FAIL: migration 020 missing")

sql020 = migration_020.read_text(encoding="utf-8")
lower020 = sql020.lower()

for public_name, private_name in TARGETS.items():
    item = latest_public.get(public_name)
    if not item:
        raise SystemExit(f"SECURITY STATIC FAIL: public.{public_name} missing")
    _, definition = item
    lower = definition.lower()
    if "security invoker" not in lower:
        raise SystemExit(
            f"SECURITY STATIC FAIL: public.{public_name} must be SECURITY INVOKER"
        )
    if "set search_path = ''" not in lower:
        raise SystemExit(
            f"SECURITY STATIC FAIL: public.{public_name} must set empty search_path"
        )
    if f"app_private.{private_name}" not in lower:
        raise SystemExit(
            f"SECURITY STATIC FAIL: public.{public_name} must delegate to app_private.{private_name}"
        )

    private_re = re.compile(
        rf"create\s+or\s+replace\s+function\s+app_private\.{re.escape(private_name)}\s*"
        rf"\((.*?)\)\s*returns\b.*?\bsecurity\s+definer\b.*?"
        rf"\bset\s+search_path\s*=\s*''.*?\bas\s+\$\$(.*?)\$\$;",
        re.IGNORECASE | re.DOTALL,
    )
    private_match = private_re.search(sql020)
    if not private_match:
        raise SystemExit(
            f"SECURITY STATIC FAIL: hardened private helper app_private.{private_name} missing"
        )
    if "auth.uid()" not in private_match.group(2).lower():
        raise SystemExit(
            f"SECURITY STATIC FAIL: app_private.{private_name} must bind authorization to auth.uid()"
        )

    wrapper_revoke = re.compile(
        rf"revoke\s+execute\s+on\s+function\s+public\.{re.escape(public_name)}"
        rf"\s*\([^;]+\)\s+from\s+public\s*,\s*anon\s*;",
        re.IGNORECASE | re.DOTALL,
    )
    wrapper_grant = re.compile(
        rf"grant\s+execute\s+on\s+function\s+public\.{re.escape(public_name)}"
        rf"\s*\([^;]+\)\s+to\s+authenticated\s*;",
        re.IGNORECASE | re.DOTALL,
    )
    private_revoke = re.compile(
        rf"revoke\s+execute\s+on\s+function\s+app_private\.{re.escape(private_name)}"
        rf"\s*\([^;]+\)\s+from\s+public\s*,\s*anon\s*;",
        re.IGNORECASE | re.DOTALL,
    )
    private_grant = re.compile(
        rf"grant\s+execute\s+on\s+function\s+app_private\.{re.escape(private_name)}"
        rf"\s*\([^;]+\)\s+to\s+authenticated\s*;",
        re.IGNORECASE | re.DOTALL,
    )

    if not wrapper_revoke.search(sql020) or not wrapper_grant.search(sql020):
        raise SystemExit(
            f"SECURITY STATIC FAIL: public.{public_name} EXECUTE grants are not hardened"
        )
    if not private_revoke.search(sql020) or not private_grant.search(sql020):
        raise SystemExit(
            f"SECURITY STATIC FAIL: app_private.{private_name} EXECUTE grants are not hardened"
        )

migration_022 = Path("backend/migrations/022_school_cloud_idempotency.sql")
if not migration_022.exists():
    raise SystemExit("SECURITY STATIC FAIL: migration 022 missing")
sql022 = migration_022.read_text(encoding="utf-8")
lower022 = sql022.lower()

idempotent_targets = {
    "create_guardian_child_idempotent": "create_guardian_child_idempotent_secure",
    "create_school_class_idempotent": "create_school_class_idempotent_secure",
    "create_class_invite_idempotent": "create_class_invite_idempotent_secure",
}

for public_name, private_name in idempotent_targets.items():
    item = latest_public.get(public_name)
    if not item:
        raise SystemExit(f"SECURITY STATIC FAIL: public.{public_name} missing")
    _, definition = item
    lower = definition.lower()
    if "security invoker" not in lower:
        raise SystemExit(
            f"SECURITY STATIC FAIL: public.{public_name} must be SECURITY INVOKER"
        )
    if "set search_path = ''" not in lower:
        raise SystemExit(
            f"SECURITY STATIC FAIL: public.{public_name} must set empty search_path"
        )
    if f"app_private.{private_name}" not in lower:
        raise SystemExit(
            f"SECURITY STATIC FAIL: public.{public_name} must delegate to app_private.{private_name}"
        )

    private_re = re.compile(
        rf"create\s+or\s+replace\s+function\s+app_private\.{re.escape(private_name)}\s*"
        rf"\((.*?)\)\s*returns\b.*?\bsecurity\s+definer\b.*?"
        rf"\bset\s+search_path\s*=\s*''.*?\bas\s+\$\$(.*?)\$\$;",
        re.IGNORECASE | re.DOTALL,
    )
    private_match = private_re.search(sql022)
    if not private_match:
        raise SystemExit(
            f"SECURITY STATIC FAIL: hardened idempotent helper app_private.{private_name} missing"
        )
    body = private_match.group(2).lower()
    if "idempotency_begin" not in body or "idempotency_finish" not in body:
        raise SystemExit(
            f"SECURITY STATIC FAIL: app_private.{private_name} must use the idempotency ledger"
        )

if "revoke all on table app_private.idempotency_keys from public, anon, authenticated" not in lower022:
    raise SystemExit("SECURITY STATIC FAIL: idempotency ledger direct grants not revoked")

for helper in (
    "idempotency_begin(text,uuid,text)",
    "idempotency_finish(text,uuid,uuid)",
):
    if f"revoke execute on function app_private.{helper} from public, anon, authenticated" not in lower022:
        raise SystemExit(
            f"SECURITY STATIC FAIL: app_private.{helper} client EXECUTE revoke missing"
        )

role_hardening = Path(
    "backend/migrations/018_profile_type_role_hardening.sql"
).read_text(encoding="utf-8").lower()
if "revoke update on table public.profiles from authenticated" not in role_hardening:
    raise SystemExit("SECURITY STATIC FAIL: profiles table-wide UPDATE revoke missing")
if "grant update(display_name) on table public.profiles to authenticated" not in role_hardening:
    raise SystemExit("SECURITY STATIC FAIL: profiles display_name-only UPDATE grant missing")
if "grant update on table public.profiles to authenticated" in role_hardening:
    raise SystemExit("SECURITY STATIC FAIL: broad profiles UPDATE grant reintroduced")

print(
    "security static PASS: latest public RPC definitions are SECURITY INVOKER; "
    "privileged lifecycle logic is private, auth-bound and explicitly granted"
)
