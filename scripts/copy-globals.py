"""Den globals-Singleton von einer Directus-Instanz auf eine andere kopieren.

Warum es dieses Skript gibt: die directus-template-cli kann `globals` nicht
extrahieren. Sie ruft `/items/globals` ab und spreizt die Antwort als Array -
fuer Singletons liefert Directus aber ein einzelnes Objekt, kein Array. Der
Extract bricht dann ab mit

    Spread syntax requires ...iterable[Symbol.iterator] to be a function
    Context: {"collection":"globals","function":"getDataFromCollection"}

Deshalb wird `globals` beim Extract per --exclude-collections uebersprungen und
der eine Datensatz stattdessen hiermit uebertragen. Das Schema der Collection
kommt normal ueber das Template mit - nur die Inhalte fehlen.

`globals` ist die einzige Singleton-Collection in diesem Projekt (geprueft gegen
snapshot.yaml), es bleibt also bei diesem einen Sonderfall.

    python scripts/copy-globals.py --check
    python scripts/copy-globals.py

Zugangsdaten kommen aus der Umgebung oder der .env im Projektwurzelverzeichnis:

    SOURCE_DIRECTUS_URL / SOURCE_DIRECTUS_TOKEN
    TARGET_DIRECTUS_URL / TARGET_DIRECTUS_TOKEN

Faellt auf PUBLIC_DIRECTUS_URL und PUBLIC_DIRECTUS_TOKEN aus der .env zurueck,
wenn SOURCE_* nicht gesetzt ist - das ist im Normalfall genau die Quellinstanz.

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

ENV_FILE = Path(__file__).resolve().parent.parent / ".env"

# Von Directus selbst gepflegt - mitzuschicken waere nicht nur unnoetig, die
# User-UUIDs zeigen auf der Zielinstanz womoeglich ins Leere.
MANAGED_FIELDS = {
    "id",
    "date_created",
    "user_created",
    "date_updated",
    "user_updated",
}


def load_env(name: str) -> str:
    if value := os.environ.get(name):
        return value.strip()
    if ENV_FILE.is_file():
        for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
            if match := re.match(rf"^(?:PUBLIC_)?{name}=(.+)$", line):
                return match.group(1).strip()
    return ""


def get_globals(url: str, token: str) -> dict[str, Any]:
    response = requests.get(
        f"{url.rstrip('/')}/items/globals",
        headers={"Authorization": f"Bearer {token}"},
        timeout=30,
    )
    response.raise_for_status()
    data = response.json().get("data")
    if not isinstance(data, dict):
        sys.exit(f"Unerwartete Antwort von {url}: {type(data).__name__} statt Objekt")
    return data


def describe(payload: dict[str, Any]) -> None:
    for key in sorted(payload):
        value = payload[key]
        if isinstance(value, (dict, list)):
            rendered = f"<{type(value).__name__}, {len(value)} Eintraege>"
        elif value is None:
            rendered = "-"
        else:
            rendered = str(value)
            if len(rendered) > 60:
                rendered = rendered[:57] + "..."
        print(f"  {key:20} {rendered}")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--check", action="store_true", help="nur anzeigen, nichts schreiben"
    )
    args = parser.parse_args()

    source_url = load_env("SOURCE_DIRECTUS_URL") or load_env("DIRECTUS_URL")
    source_token = load_env("SOURCE_DIRECTUS_TOKEN") or load_env("DIRECTUS_TOKEN")
    target_url = load_env("TARGET_DIRECTUS_URL")
    target_token = load_env("TARGET_DIRECTUS_TOKEN")

    if not (source_url and source_token):
        sys.exit("SOURCE_DIRECTUS_URL / SOURCE_DIRECTUS_TOKEN fehlen")
    if not args.check and not (target_url and target_token):
        sys.exit("TARGET_DIRECTUS_URL / TARGET_DIRECTUS_TOKEN fehlen")

    print(f"Quelle: {source_url}")
    payload = {
        key: value
        for key, value in get_globals(source_url, source_token).items()
        if key not in MANAGED_FIELDS
    }
    print(f"{len(payload)} Felder gelesen:")
    describe(payload)

    if args.check:
        print("\n--check: nichts geschrieben.")
        return 0

    # Die Referenzen auf logo, favicon und die Sponsoren sind UUIDs. Sie stimmen
    # nur, wenn das Template mit --relation-strategy=preserve angewandt wurde.
    print(f"\nZiel: {target_url}")
    response = requests.patch(
        f"{target_url.rstrip('/')}/items/globals",
        headers={
            "Authorization": f"Bearer {target_token}",
            "Content-Type": "application/json",
        },
        data=json.dumps(payload),
        timeout=30,
    )
    if not response.ok:
        sys.exit(f"PATCH fehlgeschlagen ({response.status_code}): {response.text}")

    written = get_globals(target_url, target_token)
    missing = [
        key
        for key, value in payload.items()
        if value not in (None, "", [], {}) and not written.get(key)
    ]
    if missing:
        print(f"\nWarnung: diese Felder kamen nicht an: {', '.join(missing)}")
        return 1

    print("\nglobals uebertragen.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
