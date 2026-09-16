#!/usr/bin/env python3
"""Fail CI if the production-target preflight stops being read-only.

This is a conservative static guard. It does not execute SQL or prove that a
query cannot leak data; it prevents write-capable statements and obvious raw-row
queries from entering the committed preflight file.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PREFLIGHT = ROOT / "supabase/tests/target_read_only_preflight.sql"


def fail(message: str) -> None:
    print(f"FAIL: {message}", file=sys.stderr)
    raise SystemExit(1)


def strip_comments_and_literals(source: str) -> str:
    source = re.sub(r"/\*.*?\*/", " ", source, flags=re.S)
    source = re.sub(r"--[^\n]*", " ", source)
    source = re.sub(r"\$[A-Za-z_0-9]*\$.*?\$[A-Za-z_0-9]*\$", " ", source, flags=re.S)
    source = re.sub(r"'(?:''|[^'])*'", "''", source)
    return source


def main() -> int:
    if not PREFLIGHT.is_file():
        fail("missing supabase/tests/target_read_only_preflight.sql")

    original = PREFLIGHT.read_text(encoding="utf-8")
    lowered = original.lower()
    cleaned = strip_comments_and_literals(original).lower()

    if "studio las os target read-only preflight completed" not in lowered:
        fail("target preflight completion marker is missing")

    forbidden_keywords = (
        "insert",
        "update",
        "delete",
        "alter",
        "create",
        "drop",
        "truncate",
        "grant",
        "revoke",
        "set",
        "reset",
        "do",
        "call",
        "copy",
        "vacuum",
        "analyze",
        "refresh",
        "comment",
        "merge",
    )
    forbidden_pattern = re.compile(r"\b(" + "|".join(forbidden_keywords) + r")\b")

    for index, statement in enumerate(cleaned.split(";"), start=1):
        normalized = " ".join(statement.split())
        if not normalized:
            continue
        first_keyword = normalized.split(" ", 1)[0]
        if first_keyword not in {"select", "with"}:
            fail(f"statement {index} is not SELECT/CTE-only: {first_keyword}")
        match = forbidden_pattern.search(normalized)
        if match:
            fail(f"statement {index} contains write-capable keyword: {match.group(1)}")

    forbidden_raw_row_patterns = [
        r"select\s+\*\s+from\s+public\.clients\b",
        r"select\s+\*\s+from\s+public\.profiles\b",
        r"select\s+\*\s+from\s+public\.client_intakes\b",
        r"select\s+\*\s+from\s+public\.sessions\b",
        r"select\s+\*\s+from\s+public\.body_measurements\b",
        r"select\s+\*\s+from\s+public\.reports\b",
        r"from\s+auth\.users\b",
        r"from\s+storage\.objects\b",
    ]
    for pattern in forbidden_raw_row_patterns:
        if re.search(pattern, cleaned, flags=re.S):
            fail(f"target preflight contains prohibited row-level query: {pattern}")

    required_privacy_markers = [
        "aggregate counts only",
        "do not enumerate objects or paths",
        "must never return client row values",
        "select-only",
    ]
    for marker in required_privacy_markers:
        if marker not in lowered:
            fail(f"target preflight privacy marker is missing: {marker}")

    print("Studio Las OS target read-only preflight static check completed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
