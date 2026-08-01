# Directus-Version: Ist-Stand und Upgrade auf 12

Stand 2026-08-01. Läuft aktuell: **11.17.4**.

## Kurzfassung

Ein Upgrade auf Directus 12 ist technisch machbar, aber **nicht konfliktfrei**.
Der Knackpunkt ist nicht die Technik, sondern die Lizenz: Directus 12 hat von
BUSL-1.1 auf die MSCL umgestellt und erzwingt seitdem Tier-Grenzen. Diese
Instanz liegt mit **49 Collections** über der Core-Grenze von 25.

Für einen Verein gibt es aber den **Open Innovation Grant**: Organisationen mit
unter 5 Mio. $ Jahresumsatz und weniger als 50 Mitarbeitenden bekommen Directus
kostenlos und vollständig permissiv. Das trifft auf den SV Koweg mit hoher
Wahrscheinlichkeit zu — das wäre vor einem Upgrade zu klären.

**Empfehlung:** vorerst auf 11.17.4 bleiben, den Grant beantragen, und das
Upgrade danach mit dem Test-Rig durchspielen, bevor es produktiv geht.

## Warum die Version jetzt gepinnt ist

Im Compose stand `directus/directus:11` — ein Rolling-Tag. Directus wandert
beim Start automatisch durch seine Migrationen, und ein Downgrade ist nicht
vorgesehen. Mit einem Rolling-Tag entscheidet der Zeitpunkt eines Neustarts
darüber, welche Version läuft. Deshalb steht dort jetzt `11.17.4`.

Der `11`-Tag wurde zuletzt am 30.04.2026 aktualisiert; der 11er-Zweig bekommt
offenbar keine Updates mehr. Sicherheitsupdates gibt es also nur noch über den
Sprung auf 12.

## Was diese Instanz betrifft

| Grenze | Core-Tier | Diese Instanz | |
|---|---|---|---|
| Collections | 25 | **49** | drüber |
| Seats | 3 | 2 aktive Admins (4 User mit Rolle) | drunter |

Die 53 Einträge unter „Users" täuschen: 49 davon haben **keine Rolle** — das
sind reine Personendatensätze für die Mannschaftsseiten, ohne Login. Als Seats
zählen sie nicht.

Liegt eine Instanz beim Upgrade über den Grenzen, greift ein **30-tägiger
Karenzzeitraum**, in dem alles normal weiterläuft. Danach werden ohne Lizenz
u.a. **custom rules auf Access Policies ignoriert**.

Das ist der gefährlichste Punkt für diese Website: **40 der 241 Permissions
haben Filter-Bedingungen**, darunter zentrale wie

- `pages` und `posts`: lesbar nur bei `status = published` **und**
  `published_at <= $NOW`
- `forms`, `navigation`: nur bei `is_active = true`

Die offizielle Doku sagt nicht eindeutig, ob solche filter-basierten
Leserechte unter „custom rules" fallen. Fielen sie darunter und würden
ignoriert, wären unveröffentlichte Seiten und Beiträge öffentlich abrufbar.
Das ist kein Risiko, das man auf Verdacht eingeht — es gehört vor dem Upgrade
auf einer Wegwerf-Instanz geprüft.

## Technische Breaking Changes

Geprüft gegen diesen Code:

| Änderung in v12 | Betrifft uns |
|---|---|
| `/server/health` ist auth-pflichtig, antwortet sonst 404 | Nur `docker/directus-entrypoint.sh` (vom Compose nicht genutzt). Das Backup-Tool wurde bereits auf `/server/ping` mit Fallback umgestellt. |
| `IP_TRUST_PROXY` Default `true` → `false` | Ja — im Compose bereits explizit auf `true` gesetzt, sonst steht im Activity-Log die Proxy-IP. |
| WebSockets werden gegen `CORS_ORIGIN` geprüft | `WEBSOCKETS_ENABLED=true` ist gesetzt, das Frontend nutzt sie aber nicht. Wenn der Editor sie braucht, muss `CORS_ORIGIN` die Domains enthalten. |
| SDK wirft `RequestError` statt Fehler-Property | Frontend nutzt `@directus/sdk` ^19 — beim Upgrade der SDK prüfen, ob irgendwo auf Fehler-Properties statt Exceptions geprüft wird. |
| `/utils/hash/generate` und `/utils/hash/verify` entfernt | Nein, nirgends genutzt. |
| `?version=main` → `?version=published` | Nein, nicht genutzt (rückwärtskompatibel). |
| `status`-String → `archived`-Boolean | Nur für **neu angelegte** Collections. Die 49 bestehenden bleiben unverändert. |
| SSO-Login braucht Lizenz | Nein — alle 53 User haben `provider=default`. |

## Was bereits gegen 12.2.0 getestet wurde

Die Testsuite des Backup-Repos lief komplett gegen `directus/directus:12.2.0`
— zwei frische Instanzen, seeden, zerstören, wiederherstellen:

| Geprüft | Ergebnis |
|---|---|
| Collections, Fields, Relations, Items, Files, Rollen, Flows, Settings anlegen | funktioniert |
| Schema-Snapshot über `/schema/snapshot` | funktioniert |
| Template-Export und -Import über die Template-CLI | funktioniert |
| `pg_dump` / `pg_restore` 1:1-Recovery | funktioniert |
| Umlaute, Emoji, Sonderzeichen durch den Dump-Zyklus | unverändert |

Gefunden und behoben wurde dabei genau eine Inkompatibilität im Backup-Tool:
`/server/health` ist in v12 auth-pflichtig und liefert seine Antwort in `data`
verpackt statt flach. Das Tool schickt jetzt den Token mit, packt `data` aus
und fällt auf `/server/ping` zurück.

Das heißt: **die Werkzeugkette ist bereit für 12.** Offen bleibt allein die
Lizenzfrage oben — die hängt an deinem Schema, nicht am Tooling.

## Wie du es gefahrlos testest

Das Test-Rig im Backup-Repo fährt zwei Wegwerf-Instanzen hoch und akzeptiert
die Version als Variable:

```powershell
$env:DIRECTUS_VERSION = "12.2.0"; .\tests\run-tests.ps1
```

Das prüft, ob Backup, Restore, Schema-Snapshot und Template-CLI mit der neuen
Version zusammenspielen — nicht aber, wie sich *dein* Schema mit seinen 49
Collections und 40 Filter-Permissions verhält.

Für diese Frage der ehrlichere Weg:

1. Aktuelles Backup ziehen (`backup`), Prüfsumme verifizieren (`verify --deep`)
2. Leeren Stack mit `directus/directus:12.2.0` und einer frischen Datenbank
   hochziehen
3. `restore --mode=full` darauf, dann Directus starten und die Migrationen
   laufen lassen
4. **Ohne Token** prüfen, ob unveröffentlichte Inhalte sichtbar werden:
   ```bash
   curl "https://<test-instanz>/items/posts?fields=title,status&limit=-1"
   ```
   Erscheint hier etwas mit `status != published`, greifen die Filter-Regeln
   nicht mehr — dann ist ohne Lizenz kein Upgrade möglich.

## Quellen

- [Directus v12 Breaking Changes](https://directus.com/docs/releases/breaking-changes/version-12)
- [Lizenzwechsel erklärt](https://directus.io/blog/directus-v12-license-change)
- [Licensing Overview](https://directus.com/docs/licensing/overview)
- [Self-Hosted Pricing](https://directus.io/pricing/self-hosted)
