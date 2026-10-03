#!/usr/bin/env python3
from pathlib import Path

path = Path("backend/migrations/021_foreign_key_indexes.sql")
sql = path.read_text(encoding="utf-8").lower()

expected = {
    "idx_class_invites_created_by": "public.class_invites(created_by)",
    "idx_class_join_requests_child": "public.class_join_requests(child_id)",
    "idx_class_join_requests_decided_by": "public.class_join_requests(decided_by)",
    "idx_class_join_requests_requested_by": "public.class_join_requests(requested_by)",
}

for name, target in expected.items():
    if f"create index if not exists {name}" not in sql:
        raise SystemExit(f"PERFORMANCE STATIC FAIL: missing index {name}")
    if target not in sql:
        raise SystemExit(f"PERFORMANCE STATIC FAIL: wrong target for {name}")

print("performance static PASS: 4 reviewed FK indexes present")
