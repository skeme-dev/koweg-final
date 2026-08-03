"""Feldwerte nachtragen, die ein Template-Apply verloren hat.

Wann man das braucht: die directus-template-cli legt Zeilen auch dann an, wenn
das Schreiben der Felder scheitert - etwa weil ein Fremdschluesselziel zu dem
Zeitpunkt noch nicht existiert oder Directus waehrend des Laufs kurz mit 403
antwortet. Die Zeile hat dann die richtige ID, aber ueberall NULL. Ein
Zaehlvergleich Export gegen Ziel faellt darauf herein, weil die Anzahl stimmt.

Dieses Skript vergleicht feldweise und schreibt zurueck, was im Export einen
Wert hat und im Ziel leer ist. Vorhandene Werte werden nie ueberschrieben - ein
zweiter Lauf aendert also nichts mehr.

    python scripts/repair-template-apply.py --check
    python scripts/repair-template-apply.py

Zugangsdaten wie bei copy-globals.py aus der Umgebung oder der .env:

    TARGET_DIRECTUS_URL / TARGET_DIRECTUS_TOKEN

Alias-Felder (o2m, m2m, Gruppen, Trenner) werden uebersprungen: sie haben keine
eigene Spalte und ergeben sich aus der Gegenseite. `teams.trainers` etwa faellt
von selbst richtig aus, sobald die Zeilen in teams_directus_users stimmen -
deshalb ist die Reihenfolge unten nach Abhaengigkeit sortiert.

Benoetigt nur `requests`:

    pip install requests
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path
from typing import Any

import requests

ROOT = Path(__file__).resolve().parent.parent
ENV_FILE = ROOT / ".env"
TEMPLATE = ROOT / "directus-template" / "src"

# Von Directus gepflegt - nie zurueckschreiben.
MANAGED_FIELDS = {"date_created", "user_created", "date_updated", "user_updated"}

# Abhaengigkeitsreihenfolge: was referenziert wird, zuerst. Collections, die
# hier nicht stehen, kommen danach in alphabetischer Reihenfolge.
PRIORITY = [
    "departments",
    "teams",
    "teams_directus_users",
]


def load_env(name: str) -> str:
    if value := os.environ.get(name):
        return value.strip()
    if ENV_FILE.is_file():
        for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
            if match := re.match(rf"^(?:PUBLIC_)?{name}=(.+)$", line):
                return match.group(1).strip()
    return ""


def alias_fields() -> dict[str, set[str]]:
    """Felder ohne eigene Spalte - o2m, m2m, Gruppen, Trenner."""
    out: dict[str, set[str]] = {}
    for field in json.loads((TEMPLATE / "fields.json").read_text(encoding="utf-8")):
        if field.get("type") == "alias" or field.get("schema") is None:
            out.setdefault(field["collection"], set()).add(field["field"])
    return out


def is_empty(value: Any) -> bool:
    return value in (None, "", [], {})


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--check", action="store_true", help="nur anzeigen, nichts schreiben"
    )
    args = parser.parse_args()

    url = load_env("TARGET_DIRECTUS_URL").rstrip("/")
    token = load_env("TARGET_DIRECTUS_TOKEN")
    if not (url and token):
        sys.exit("TARGET_DIRECTUS_URL / TARGET_DIRECTUS_TOKEN fehlen")

    session = requests.Session()
    session.headers["Authorization"] = f"Bearer {token}"
    aliases = alias_fields()

    content_dir = TEMPLATE / "content"
    names = [p.stem for p in sorted(content_dir.glob("*.json"))]
    names.sort(key=lambda n: (PRIORITY.index(n) if n in PRIORITY else len(PRIORITY), n))

    print(f"Ziel: {url}{' (dry-run)' if args.check else ''}\n")
    total_rows = total_fields = 0

    for name in names:
        export = json.loads((content_dir / name).with_suffix(".json").read_text(encoding="utf-8"))
        if not export:
            continue

        response = session.get(f"{url}/items/{name}", params={"limit": -1}, timeout=60)
        if not response.ok:
            print(f"{name:28} ABRUF FEHLGESCHLAGEN ({response.status_code})")
            continue
        target = {str(row.get("id")): row for row in response.json()["data"]}

        skip = aliases.get(name, set()) | MANAGED_FIELDS
        repairs: list[tuple[str, dict[str, Any]]] = []
        for row in export:
            current = target.get(str(row.get("id")))
            if current is None:
                continue
            patch = {
                key: value
                for key, value in row.items()
                if key != "id"
                and key not in skip
                and not is_empty(value)
                and is_empty(current.get(key))
            }
            if patch:
                repairs.append((str(row["id"]), patch))

        if not repairs:
            continue

        fields = sum(len(p) for _, p in repairs)
        total_rows += len(repairs)
        total_fields += fields
        print(f"{name:28} {len(repairs):4} Zeilen, {fields:4} Felder")

        if args.check:
            example_id, example = repairs[0]
            print(f"{'':28} z.B. id={example_id}: {', '.join(sorted(example))}")
            continue

        failed = 0
        for row_id, patch in repairs:
            result = session.patch(
                f"{url}/items/{name}/{row_id}",
                data=json.dumps(patch),
                headers={"Content-Type": "application/json"},
                timeout=60,
            )
            if not result.ok:
                failed += 1
                if failed <= 3:
                    print(f"{'':28} id={row_id}: {result.status_code} {result.text[:120]}")
        if failed:
            print(f"{'':28} {failed} Zeilen fehlgeschlagen")

    if not total_rows:
        print("Nichts nachzutragen - Ziel entspricht dem Export.")
        return 0

    print(f"\n{total_rows} Zeilen, {total_fields} Felder"
          f"{' zu reparieren' if args.check else ' nachgetragen'}.")
    if args.check:
        print("--check: nichts geschrieben.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
