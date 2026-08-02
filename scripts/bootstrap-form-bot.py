"""Formular-Einreichungen auf einer frischen Directus-Instanz freischalten.

Loest das Henne-Ei-Problem beim ersten Deploy: PUBLIC_DIRECTUS_FORM_TOKEN wird
beim BUILD des Frontends gebraucht (die Variable kommt aus $env/static/public
und wird ins Bundle gebacken), der Token existiert zu dem Zeitpunkt aber noch
nicht - und Directus gibt einen bereits gesetzten Token nie wieder heraus, die
API liefert nur `**********`.

Loesung: den Token selbst vorgeben statt generieren lassen.

    1. Token erzeugen:   openssl rand -hex 32
    2. In Coolify als PUBLIC_DIRECTUS_FORM_TOKEN eintragen (vor dem Build)
    3. Nach dem ersten Directus-Start dieses Skript laufen lassen - es legt
       Ordner, Policy, Rechte und den Bot-User an und setzt genau diesen Token.

Idempotent: vorhandene Objekte werden wiederverwendet, der Token wird immer neu
gesetzt (er ist ja nicht auslesbar).

    python scripts/bootstrap-form-bot.py --check
    python scripts/bootstrap-form-bot.py

Zugangsdaten kommen aus der Umgebung oder der .env im Projektwurzelverzeichnis:

    DIRECTUS_URL           z.B. https://directus.skeme.dev
    DIRECTUS_EMAIL / DIRECTUS_PASSWORD   (Admin, beim ersten Deploy aus Coolify)
    oder DIRECTUS_TOKEN    (Admin-Token)
    FORM_TOKEN             der selbst gewaehlte Token fuer den Bot

Hinweis: Die Policy wird zusaetzlich oeffentlich zugewiesen, so wie es die
bestehende Instanz haelt. Formulare funktionieren dadurch auch ohne Token -
der Bot-User ist die Absicherung fuer den Fall, dass die oeffentliche
Zuweisung spaeter entfernt wird.

Benoetigt nur `requests`:

    pip install requests
"""

from __future__ import annotations

import argparse
import os
import re
import sys
from pathlib import Path
from typing import Any

import requests

ENV_FILE = Path(__file__).resolve().parent.parent / ".env"

UPLOAD_FOLDER = "3. Uploads"
POLICY_NAME = "Forms - Submission"
BOT_FIRST_NAME = "Frontend"
BOT_LAST_NAME = "Bot"
MAX_UPLOAD_BYTES = 5_000_000


def load_env(name: str) -> str:
    if value := os.environ.get(name):
        return value.strip()
    if ENV_FILE.is_file():
        for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
            # PUBLIC_DIRECTUS_URL zaehlt auch als DIRECTUS_URL
            if match := re.match(rf"^(?:PUBLIC_)?{name}=(.+)$", line):
                return match.group(1).strip()
    return ""


class Api:
    def __init__(self, url: str, dry_run: bool = False):
        self.url = url.rstrip("/")
        self.dry_run = dry_run
        self.session = requests.Session()

    def login(self, token: str, email: str, password: str) -> None:
        if token:
            self.session.headers["Authorization"] = f"Bearer {token}"
            return
        response = self.session.post(
            f"{self.url}/auth/login", json={"email": email, "password": password}, timeout=30
        )
        if not response.ok:
            sys.exit(f"Login fehlgeschlagen: {response.status_code} {response.text[:300]}")
        self.session.headers["Authorization"] = f"Bearer {response.json()['data']['access_token']}"

    def get(self, path: str, **params: Any):
        response = self.session.get(f"{self.url}{path}", params=params or None, timeout=30)
        if response.status_code in (403, 404):
            return None
        response.raise_for_status()
        return response.json().get("data")

    def post(self, path: str, payload: Any):
        if self.dry_run:
            print(f"    [dry-run] POST {path}")
            return None
        response = self.session.post(f"{self.url}{path}", json=payload, timeout=30)
        if not response.ok:
            sys.exit(f"POST {path} -> {response.status_code}: {response.text[:500]}")
        return (response.json() or {}).get("data")

    def patch(self, path: str, payload: Any):
        if self.dry_run:
            print(f"    [dry-run] PATCH {path}")
            return None
        response = self.session.patch(f"{self.url}{path}", json=payload, timeout=30)
        if not response.ok:
            sys.exit(f"PATCH {path} -> {response.status_code}: {response.text[:500]}")
        return (response.json() or {}).get("data")


def ensure_folder(api: Api) -> str:
    folders = api.get("/folders", fields="id,name", limit=-1) or []
    for folder in folders:
        if folder["name"] == UPLOAD_FOLDER:
            print(f"  Ordner {UPLOAD_FOLDER!r}: vorhanden")
            return folder["id"]
    print(f"  Ordner {UPLOAD_FOLDER!r}: angelegt")
    created = api.post("/folders", {"name": UPLOAD_FOLDER})
    return (created or {}).get("id", "")


def ensure_policy(api: Api) -> str:
    policies = api.get("/policies", fields="id,name", limit=-1) or []
    for policy in policies:
        if policy["name"] == POLICY_NAME:
            print(f"  Policy {POLICY_NAME!r}: vorhanden")
            return policy["id"]
    print(f"  Policy {POLICY_NAME!r}: angelegt")
    created = api.post(
        "/policies",
        {
            "name": POLICY_NAME,
            "icon": "mail",
            "description": "Darf Formulare einreichen und Anhaenge hochladen.",
            "admin_access": False,
            "app_access": False,
        },
    )
    return (created or {}).get("id", "")


def ensure_permissions(api: Api, policy_id: str, folder_id: str) -> None:
    """Genau die Rechte, die ein Formular braucht - und keins mehr.

    Der Upload ist auf 5 MB begrenzt und landet zwangsweise im Uploads-Ordner:
    ohne das koennte jeder Besucher beliebig grosse Dateien in die Mediathek
    schieben.
    """
    wanted = [
        {
            "collection": "directus_files",
            "action": "create",
            "fields": ["*"],
            "validation": {"_and": [{"filesize": {"_lte": MAX_UPLOAD_BYTES}}]},
            "presets": {"folder": folder_id},
        },
        {
            "collection": "directus_files",
            "action": "read",
            "fields": ["id"],
            "permissions": {"_and": [{"folder": {"_eq": folder_id}}]},
        },
        {"collection": "form_submissions", "action": "create", "fields": ["*"]},
        {"collection": "form_submissions", "action": "read", "fields": ["id"]},
        {"collection": "form_submission_values", "action": "create", "fields": ["*"]},
        {"collection": "form_submission_values", "action": "read", "fields": ["id"]},
    ]

    existing = api.get(
        "/permissions",
        filter=f'{{"policy":{{"_eq":"{policy_id}"}}}}',
        fields="id,collection,action",
        limit=-1,
    ) or []
    known = {(p["collection"], p["action"]) for p in existing}

    created = 0
    for rule in wanted:
        key = (rule["collection"], rule["action"])
        if key in known:
            continue
        api.post("/permissions", {**rule, "policy": policy_id})
        created += 1
    print(f"  Rechte: {len(known)} vorhanden, {created} ergaenzt")


def ensure_public_access(api: Api, policy_id: str) -> None:
    """Zuweisung ohne user und role = oeffentlich."""
    access = api.get("/access", filter=f'{{"policy":{{"_eq":"{policy_id}"}}}}', fields="id,user,role", limit=-1) or []
    if any(entry.get("user") is None and entry.get("role") is None for entry in access):
        print("  Oeffentliche Zuweisung: vorhanden")
        return
    print("  Oeffentliche Zuweisung: angelegt (Formulare gehen damit ohne Token)")
    api.post("/access", {"policy": policy_id, "user": None, "role": None})


def ensure_bot_user(api: Api, policy_id: str, form_token: str) -> str:
    users = api.get("/users", fields="id,first_name,last_name,status", limit=-1) or []
    bot = next(
        (u for u in users if u.get("first_name") == BOT_FIRST_NAME and u.get("last_name") == BOT_LAST_NAME),
        None,
    )

    if bot:
        print(f"  Bot-User: vorhanden ({bot['id']})")
        user_id = bot["id"]
    else:
        print("  Bot-User: angelegt")
        created = api.post(
            "/users",
            {"first_name": BOT_FIRST_NAME, "last_name": BOT_LAST_NAME, "status": "active"},
        )
        user_id = (created or {}).get("id", "")

    if form_token and user_id:
        # Immer neu setzen - auslesen kann man ihn nicht.
        api.patch(f"/users/{user_id}", {"token": form_token})
        print("  Statischer Token: " + ("wuerde gesetzt" if api.dry_run else "gesetzt"))
    elif not form_token:
        print("  Statischer Token: uebersprungen (FORM_TOKEN nicht gesetzt)")

    access = api.get("/access", filter=f'{{"policy":{{"_eq":"{policy_id}"}}}}', fields="id,user", limit=-1) or []
    if any((entry.get("user") or {}) == user_id or entry.get("user") == user_id for entry in access):
        print("  Policy am Bot-User: vorhanden")
    elif user_id:
        api.post("/access", {"policy": policy_id, "user": user_id})
        print("  Policy am Bot-User: zugewiesen")
    return user_id


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="nur pruefen, nichts aendern")
    args = parser.parse_args()

    url = load_env("DIRECTUS_URL")
    token = load_env("DIRECTUS_TOKEN")
    email = load_env("DIRECTUS_EMAIL") or load_env("ADMIN_EMAIL")
    password = load_env("DIRECTUS_PASSWORD") or load_env("ADMIN_PASSWORD")
    form_token = load_env("FORM_TOKEN") or load_env("DIRECTUS_FORM_TOKEN")

    if not url:
        sys.exit("DIRECTUS_URL fehlt")
    if not (token or (email and password)):
        sys.exit("Weder DIRECTUS_TOKEN noch DIRECTUS_EMAIL + DIRECTUS_PASSWORD gesetzt")
    if not form_token and not args.check:
        sys.exit("FORM_TOKEN fehlt - erzeuge einen mit: openssl rand -hex 32")

    api = Api(url, dry_run=args.check)
    api.login(token, email, password)
    print(f"Directus: {url}{' (dry-run)' if args.check else ''}\n")

    folder_id = ensure_folder(api)
    policy_id = ensure_policy(api)
    if not policy_id:
        print("\n(dry-run: Policy fehlt, weitere Schritte nicht pruefbar)")
        return 0

    ensure_permissions(api, policy_id, folder_id)
    ensure_public_access(api, policy_id)
    ensure_bot_user(api, policy_id, form_token)

    print("\nFertig. Gegenprobe ohne Token (erwartet 400, nicht 403):")
    print(
        f'  curl -s -o /dev/null -w "%{{http_code}}" -X POST {url}/items/form_submissions '
        '-H "Content-Type: application/json" '
        '-d \'{"form":"00000000-0000-0000-0000-000000000000","values":[]}\''
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
