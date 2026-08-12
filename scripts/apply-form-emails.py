"""Die Formular-Mailvorlagen aus directus-emails/ nach Directus schreiben.

Warum per Skript und nicht im Backend: das `message`-Feld unter
Formulare -> <Formular> -> Emails ist ein WYSIWYG-Editor. TinyMCE raeumt beim
Speichern das HTML auf und verschiebt dabei alles, was zwischen <tbody> und
<tr> steht, aus der Tabelle heraus. Aus

    <tbody>
      {% for feld in _fields %}
      <tr>...</tr>
      {% endfor %}
    </tbody>

wird

    <p>{% for feld in _fields %}{% endfor %}</p>
    <table><tbody><tr>...</tr></tbody></table>

Die Schleife ist dann leer und die Tabellenzeile steht ausserhalb - `feld.label`
und `feld.value` loesen sich zu nichts auf. In der Mail bleibt nur stehen, was
keine Schleife braucht, typischerweise `_submitted_at`. Genau dieses Bild hatten
wir am 03.08.2026 beim Kontaktformular.

`forms.emails` ist ein JSON-Feld. Ueber die API geschrieben laeuft der Inhalt
nie durch den Editor und bleibt unversehrt.

    python scripts/apply-form-emails.py --check
    python scripts/apply-form-emails.py

Zugangsdaten aus der Umgebung oder der .env im Projektwurzelverzeichnis:

    TARGET_DIRECTUS_URL / TARGET_DIRECTUS_TOKEN

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
EMAILS_DIR = ROOT / "directus-emails"

# (Formulartitel, Rolle) -> Vorlagendatei. Rolle "confirmation" ist der Eintrag,
# dessen Empfaenger ein Merge-Tag ist (geht an den Absender); "admin" der mit
# einer festen Adresse.
TEMPLATES = {
    ("Kontaktformular", "confirmation"): "kontaktformular-bestaetigung.html",
    ("Kontaktformular", "admin"): "kontaktformular-admin.html",
    ("Sportlerklause", "confirmation"): "sportlerklause-bestaetigung.html",
    ("Sportlerklause", "admin"): "sportlerklause-admin.html",
}


def load_env(name: str) -> str:
    if value := os.environ.get(name):
        return value.strip()
    if ENV_FILE.is_file():
        for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
            if match := re.match(rf"^(?:PUBLIC_)?{name}=(.+)$", line):
                return match.group(1).strip()
    return ""


def role_of(entry: dict[str, Any]) -> str:
    """Empfaenger mit Merge-Tag = Bestaetigung an den Absender."""
    recipients = entry.get("to") or []
    if isinstance(recipients, str):
        recipients = [recipients]
    return "confirmation" if any("{#" in str(r) for r in recipients) else "admin"


def loop_tags(html: str) -> int:
    return len(re.findall(r"\{%", html or ""))


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

    if not EMAILS_DIR.is_dir():
        sys.exit(f"{EMAILS_DIR} fehlt - die Vorlagen liegen dort")

    session = requests.Session()
    session.headers["Authorization"] = f"Bearer {token}"

    response = session.get(
        f"{url}/items/forms", params={"limit": -1, "fields": "id,title,emails"}, timeout=60
    )
    response.raise_for_status()

    print(f"Ziel: {url}{' (dry-run)' if args.check else ''}\n")
    changed_forms = 0

    for form in response.json()["data"]:
        title = form.get("title")
        entries = form.get("emails") or []
        updates: list[str] = []

        for entry in entries:
            if not isinstance(entry, dict):
                continue

            filename = TEMPLATES.get((title, role_of(entry)))
            if not filename:
                continue

            path = EMAILS_DIR / filename
            if not path.is_file():
                print(f"  {title}: {filename} fehlt - uebersprungen")
                continue

            wanted = path.read_text(encoding="utf-8").strip()
            current = (entry.get("message") or "").strip()
            if current == wanted:
                continue

            updates.append(
                f"{role_of(entry):12} <- {filename}"
                f"  ({len(current)} -> {len(wanted)} Zeichen"
                f", Schleifen-Tags {loop_tags(current)} -> {loop_tags(wanted)})"
            )
            entry["message"] = wanted

        if not updates:
            continue

        changed_forms += 1
        print(f"{title}")
        for line in updates:
            print(f"    {line}")

        if args.check:
            continue

        result = session.patch(
            f"{url}/items/forms/{form['id']}",
            data=json.dumps({"emails": entries}),
            headers={"Content-Type": "application/json"},
            timeout=60,
        )
        if not result.ok:
            print(f"    FEHLER {result.status_code}: {result.text[:200]}")
            return 1

    if not changed_forms:
        print("Nichts zu tun - Directus entspricht den Vorlagen.")
        return 0

    print(f"\n{changed_forms} Formular(e)"
          f"{' zu aktualisieren' if args.check else ' aktualisiert'}.")
    if args.check:
        print("--check: nichts geschrieben.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
