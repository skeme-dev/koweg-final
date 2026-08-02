"""Trainer koennen mehreren Mannschaften zugeordnet werden.

Ersetzt die 1:1-Zuordnung directus_users.related_team (M2O) durch eine
M2M-Verknuepfung teams <-> directus_users ueber die Junction
teams_directus_users, mit Sortierung und einem Freitextfeld `funktion`
(Cheftrainer, Co-Trainer, Betreuer ...) pro Mannschaft.

Wurde am 2026-07-31 gegen directus.skeme.dev ausgefuehrt. Bleibt im Repo, weil
das Schema live lebt: auf einer neu aufgebauten Instanz stellt dieses Skript
denselben Stand her.

Idempotent - bereits vorhandene Strukturen, Rechte und Zuordnungen werden
uebersprungen. Liest URL und Token aus der .env im Projektwurzelverzeichnis.

    python scripts/migrate-trainers-m2m.py --check   # nur pruefen
    python scripts/migrate-trainers-m2m.py           # anlegen + migrieren

Benoetigt nur `requests`:

    pip install requests
"""

from __future__ import annotations

import argparse
import os
import re
import sys
from pathlib import Path

import requests

JUNCTION = "teams_directus_users"
TEAM_FIELD = "trainers"          # teams.trainers
USER_FIELD = "teams"             # directus_users.teams
ENV_FILE = Path(__file__).resolve().parent.parent / ".env"


def load_env() -> tuple[str, str]:
    url = token = ""
    for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
        if match := re.match(r"^PUBLIC_DIRECTUS_URL=(.+)$", line):
            url = match.group(1).strip().rstrip("/")
        elif match := re.match(r"^PUBLIC_DIRECTUS_TOKEN=(.+)$", line):
            token = match.group(1).strip()
    if not (url and token):
        sys.exit("DIRECTUS URL/TOKEN not found in .env")
    return url, token


class Api:
    def __init__(self, url: str, token: str, dry_run: bool = False):
        self.url = url
        self.dry_run = dry_run
        self.session = requests.Session()
        self.session.headers["Authorization"] = f"Bearer {token}"

    def get(self, path: str, **params):
        response = self.session.get(f"{self.url}{path}", params=params, timeout=60)
        if response.status_code == 403 or response.status_code == 404:
            return None
        response.raise_for_status()
        return response.json().get("data")

    def post(self, path: str, payload):
        if self.dry_run:
            print(f"    [dry-run] POST {path}")
            return None
        response = self.session.post(f"{self.url}{path}", json=payload, timeout=60)
        if not response.ok:
            sys.exit(f"POST {path} -> {response.status_code}: {response.text[:600]}")
        return (response.json() or {}).get("data")

    def patch(self, path: str, payload):
        if self.dry_run:
            print(f"    [dry-run] PATCH {path}")
            return None
        response = self.session.patch(f"{self.url}{path}", json=payload, timeout=60)
        if not response.ok:
            sys.exit(f"PATCH {path} -> {response.status_code}: {response.text[:600]}")
        return (response.json() or {}).get("data")


def collection_exists(api: Api, name: str) -> bool:
    return api.get(f"/collections/{name}") is not None


def field_exists(api: Api, collection: str, field: str) -> bool:
    return api.get(f"/fields/{collection}/{field}") is not None


def relation_exists(api: Api, collection: str, field: str) -> bool:
    for relation in api.get("/relations") or []:
        if relation["collection"] == collection and relation["field"] == field:
            return True
    return False


def create_junction(api: Api) -> None:
    if collection_exists(api, JUNCTION):
        print(f"  {JUNCTION}: existiert bereits")
        return

    print(f"  {JUNCTION}: lege Junction-Collection an")
    api.post(
        "/collections",
        {
            "collection": JUNCTION,
            # Junctions gehoeren nicht in die Seitenleiste - Directus macht das genauso.
            "meta": {"hidden": True, "icon": "import_export", "sort_field": "sort"},
            "schema": {"name": JUNCTION},
            "fields": [
                {
                    "field": "id",
                    "type": "integer",
                    "meta": {"hidden": True, "interface": "input", "readonly": True},
                    "schema": {"is_primary_key": True, "has_auto_increment": True},
                },
                {
                    "field": "teams_id",
                    "type": "uuid",
                    "meta": {"hidden": True},
                    "schema": {"is_nullable": True},
                },
                {
                    "field": "directus_users_id",
                    "type": "uuid",
                    "meta": {"hidden": True},
                    "schema": {"is_nullable": True},
                },
                {
                    "field": "sort",
                    "type": "integer",
                    "meta": {"hidden": True},
                    "schema": {"is_nullable": True},
                },
                {
                    "field": "funktion",
                    "type": "string",
                    "meta": {
                        "interface": "input",
                        "options": {
                            "placeholder": "z.B. Cheftrainer, Co-Trainer, Betreuer",
                            "trim": True,
                        },
                        "note": "Funktion dieser Person in genau dieser Mannschaft.",
                        "width": "full",
                    },
                    "schema": {"is_nullable": True},
                },
            ],
        },
    )


def create_alias_fields(api: Api) -> None:
    if field_exists(api, "teams", TEAM_FIELD):
        print(f"  teams.{TEAM_FIELD}: existiert bereits")
    else:
        print(f"  teams.{TEAM_FIELD}: lege M2M-Feld an")
        api.post(
            "/fields/teams",
            {
                "field": TEAM_FIELD,
                "type": "alias",
                "meta": {
                    "special": ["m2m"],
                    "interface": "list-m2m",
                    "options": {
                        "template": "{{directus_users_id.first_name}} {{directus_users_id.last_name}}{{funktion}}",
                        "enableSelect": True,
                    },
                    "note": "Trainer und Verantwortliche. Eine Person kann in mehreren Mannschaften stehen.",
                    "width": "full",
                    "searchable": True,
                },
            },
        )

    if field_exists(api, "directus_users", USER_FIELD):
        print(f"  directus_users.{USER_FIELD}: existiert bereits")
    else:
        print(f"  directus_users.{USER_FIELD}: lege M2M-Gegenseite an")
        api.post(
            "/fields/directus_users",
            {
                "field": USER_FIELD,
                "type": "alias",
                "meta": {
                    "special": ["m2m"],
                    "interface": "list-m2m",
                    "options": {"template": "{{teams_id.title}}{{funktion}}", "enableSelect": True},
                    "note": "Mannschaften, in denen diese Person taetig ist.",
                    "width": "full",
                },
            },
        )


def create_relations(api: Api) -> None:
    if relation_exists(api, JUNCTION, "teams_id"):
        print(f"  {JUNCTION}.teams_id: Relation existiert bereits")
    else:
        print(f"  {JUNCTION}.teams_id -> teams")
        api.post(
            "/relations",
            {
                "collection": JUNCTION,
                "field": "teams_id",
                "related_collection": "teams",
                "meta": {
                    "one_field": TEAM_FIELD,
                    "junction_field": "directus_users_id",
                    "sort_field": "sort",
                    "one_deselect_action": "delete",
                },
                "schema": {"on_delete": "CASCADE"},
            },
        )

    if relation_exists(api, JUNCTION, "directus_users_id"):
        print(f"  {JUNCTION}.directus_users_id: Relation existiert bereits")
    else:
        print(f"  {JUNCTION}.directus_users_id -> directus_users")
        api.post(
            "/relations",
            {
                "collection": JUNCTION,
                "field": "directus_users_id",
                "related_collection": "directus_users",
                "meta": {
                    "one_field": USER_FIELD,
                    "junction_field": "teams_id",
                    "one_deselect_action": "delete",
                },
                "schema": {"on_delete": "CASCADE"},
            },
        )


def migrate_assignments(api: Api) -> None:
    users = api.get("/users", fields="id,first_name,last_name,related_team,team_sort", limit=-1) or []
    assigned = [user for user in users if user.get("related_team")]
    print(f"  {len(assigned)} bestehende Zuordnungen gefunden")

    existing = api.get(f"/items/{JUNCTION}", fields="teams_id,directus_users_id", limit=-1) or []
    known = {(row["teams_id"], row["directus_users_id"]) for row in existing}
    if known:
        print(f"  {len(known)} Junction-Eintraege bereits vorhanden")

    created = 0
    for user in assigned:
        key = (user["related_team"], user["id"])
        if key in known:
            continue
        api.post(
            f"/items/{JUNCTION}",
            {
                "teams_id": user["related_team"],
                "directus_users_id": user["id"],
                "sort": user.get("team_sort"),
            },
        )
        created += 1
    print(f"  {created} Zuordnungen uebernommen")


def grant_public_read(api: Api) -> None:
    """Die Website liest anonym - neue Collections brauchen die public-Policy.

    Ohne diesen Schritt liefert die API die Junction als leere Liste, ohne
    Fehlermeldung: die Trainer waeren im Backend gepflegt, aber unsichtbar.
    Vorlage ist die bestehende Junction teams_trainings_1.
    """
    permissions = api.get(
        "/permissions",
        filter='{"collection":{"_in":["teams_trainings_1","' + JUNCTION + '"]},"action":{"_eq":"read"}}',
        fields="id,collection,policy,fields",
        limit=-1,
    ) or []

    template = next((p for p in permissions if p["collection"] == "teams_trainings_1"), None)
    if template is None:
        print("  WARNUNG: keine Vorlage-Permission fuer teams_trainings_1 gefunden")
        return
    if any(p["collection"] == JUNCTION for p in permissions):
        print(f"  {JUNCTION}: Leserecht existiert bereits")
        return

    print(f"  {JUNCTION}: Leserecht fuer Policy {template['policy']} angelegt")
    api.post(
        "/permissions",
        {
            "collection": JUNCTION,
            "action": "read",
            "policy": template["policy"],
            "fields": ["*"],
            "permissions": {},
            "validation": {},
        },
    )


def hide_legacy_fields(api: Api) -> None:
    """Altes M2O bleibt als Rueckfallebene, verschwindet aber aus dem Editor."""
    note = "Veraltet - ersetzt durch die M2M-Zuordnung. Wird nach der Umstellung entfernt."
    for collection, field in (("directus_users", "related_team"), ("teams", "members")):
        if not field_exists(api, collection, field):
            continue
        print(f"  {collection}.{field}: im Editor ausgeblendet")
        api.patch(f"/fields/{collection}/{field}", {"meta": {"hidden": True, "note": note}})


def report(api: Api) -> None:
    teams = api.get("/items/teams", fields="title,trainers.directus_users_id.first_name,trainers.directus_users_id.last_name,trainers.funktion,trainers.sort", limit=-1, sort="sort") or []
    print("\nErgebnis pro Mannschaft:")
    for team in teams:
        trainers = team.get("trainers") or []
        names = []
        for row in sorted(trainers, key=lambda r: (r.get("sort") is None, r.get("sort") or 0)):
            user = row.get("directus_users_id") or {}
            label = f"{user.get('first_name', '')} {user.get('last_name', '')}".strip()
            if row.get("funktion"):
                label += f" ({row['funktion']})"
            names.append(label)
        print(f"  {team['title']:<24} {', '.join(names) if names else '-'}")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="nichts aendern, nur berichten")
    args = parser.parse_args()

    url, token = load_env()
    api = Api(url, token, dry_run=args.check)
    print(f"Directus: {url}{' (dry-run)' if args.check else ''}\n")

    if args.check:
        print("Vorhanden:")
        print(f"  Collection {JUNCTION}: {collection_exists(api, JUNCTION)}")
        print(f"  teams.{TEAM_FIELD}: {field_exists(api, 'teams', TEAM_FIELD)}")
        print(f"  directus_users.{USER_FIELD}: {field_exists(api, 'directus_users', USER_FIELD)}")
        if collection_exists(api, JUNCTION):
            report(api)
        return 0

    print("1. Schema")
    create_junction(api)
    create_alias_fields(api)
    create_relations(api)

    print("\n2. Berechtigungen")
    grant_public_read(api)

    print("\n3. Daten")
    migrate_assignments(api)

    print("\n4. Aufraeumen")
    hide_legacy_fields(api)

    report(api)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
