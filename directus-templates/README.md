# System-E-Mail-Templates für Directus

Ersetzen die englischen Standard-Mails von Directus durch deutsche im
Vereins-Design. Nicht zu verwechseln mit [directus-emails/](../directus-emails/) —
das sind die Templates für **Formular-Benachrichtigungen**, die über einen Flow
laufen. Hier geht es um die Mails, die Directus selbst verschickt.

| Datei | Wann sie verschickt wird |
|---|---|
| `base.liquid` | Grundgerüst für alle drei — Logo, Kopf, Fußzeile |
| `password-reset.liquid` | „Passwort vergessen" bzw. `POST /auth/password/request` |
| `user-invitation.liquid` | Settings → Users → Invite, bzw. `POST /users/invite` |
| `user-registration.liquid` | Selbstregistrierung. Bei uns nicht aktiv — liegt hier, damit im Fall der Fälle keine englische Standardmail rausgeht |

## Wie Directus sie findet

Directus sucht Templates zuerst in `EMAIL_TEMPLATES_PATH` und fällt erst danach
auf die mitgelieferten zurück. Der Standard ist `./templates`, im offiziellen
Image also **`/directus/templates`**. Eine namensgleiche Datei dort gewinnt —
es braucht keine Konfiguration, nur den richtigen Pfad.

Das gilt auch für `{% layout "base" %}`: weil unser Verzeichnis zuerst
durchsucht wird, greifen die drei Templates automatisch auf unser `base.liquid`
zu, nicht auf das von Directus.

## Ausrollen in Coolify

Der Inhalt dieses Ordners muss im Container unter `/directus/templates` liegen.
Zwei Wege:

**A — Persistent Storage als Datei-Mount** (kein Rebuild nötig)

In der Directus-Ressource unter *Persistent Storage* für jede der vier Dateien
einen Mount vom Typ *File* anlegen, Zielpfad `/directus/templates/<name>.liquid`,
und den Inhalt hineinkopieren. Umständlich bei vier Dateien, dafür ohne eigenes
Image.

**A2 — über das Coolify-Terminal nachladen** (am schnellsten zum Ausprobieren)

Im Coolify-Terminal den **Directus-Container** auswählen, dann:

```sh
mkdir -p /directus/templates && cd /directus/templates
```

```sh
B=https://raw.githubusercontent.com/skeme-dev/koweg-final/master/directus-templates; for f in base password-reset user-invitation user-registration; do wget -qO "$f.liquid" "$B/$f.liquid" && echo "ok $f"; done
```

```sh
ls -l /directus/templates
```

Erwartet: vier Dateien, `base.liquid` rund 9,7 KB.

> **Das überlebt keinen Redeploy.** In den Container geschriebene Dateien
> bleiben bei einem *Neustart* erhalten, aber nicht, wenn Coolify den Container
> *neu erstellt* — und das passiert bei jedem Deploy und bei jeder Änderung an
> den Environment Variables. Für Dauerbetrieb vorher unter *Persistent Storage*
> ein Volume auf `/directus/templates` legen und danach per Terminal befüllen,
> oder gleich Weg B nehmen.

Läuft die Zweig-Version statt `master`, im Befehl oben den Branch-Namen
tauschen.

**B — eigenes Image** (sauberer, wenn sich die Templates öfter ändern)

```dockerfile
FROM directus/directus:11.17.4
COPY directus-templates/ /directus/templates/
```

Damit sind die Templates versioniert und ein Deploy zieht sie mit.

> Nach dem Ausrollen muss Directus **neu starten**. LiquidJS liest die Dateien
> beim Start ein; eine geänderte Datei allein bewirkt nichts.

## Voraussetzungen in den Projekt-Einstellungen

Die Templates ziehen ihre Marke aus Settings → Project Settings. Stand
03.08.2026 auf `cms.sv-koweg.de` gesetzt:

| Einstellung | Wert | wozu |
|---|---|---|
| Project Name | `SV Koweg e.V.` | Überschriften, Grußformel, Fußzeile |
| Project Color | `#161A4E` | Buttons, Links, Trennlinie |
| Project Logo | `23e728f1-…` (PNG) | Kopfbereich |
| Project URL | `https://www.sv-koweg.de` | Logo-Verlinkung und Fußzeile |

> **Das Logo muss ein PNG oder JPG sein.** Gmail, Outlook und die meisten
> anderen Clients rendern **kein SVG** in E-Mails. Unser
> `logo_dark_mode` ist SVG und deshalb hier nicht verwendbar.

Directus baut die Logo-URL als `PUBLIC_URL/assets/<id>`. Die Datei muss also
**anonym lesbar** sein — ein Mail-Client schickt keinen Token mit. Bei uns
liegt das Logo im Ordner „1. Public" und ist damit abgedeckt.

Das Template hängt `?width=160&format=png` an. Das Original ist 832×1088 und
296 KB; transformiert sind es 55 KB, bei gleicher Darstellungsgröße.

## Gestaltungsentscheidungen

- **Du statt Sie.** Diese Mails gehen an Vereinsleute mit Backend-Zugang. Die
  Formular-Mails in [directus-emails/](../directus-emails/) siezen weiter —
  die gehen an Besucher der Website. Wer hier etwas ändert, sollte alle vier
  Dateien anfassen, damit nicht die Einladung duzt und der Passwort-Reset siezt.
- **Tabellenverschachtelung statt Flexbox.** Outlook rendert mit der
  Word-Engine. Flexbox, Grid und externe Stylesheets fallen aus, Stile müssen
  inline stehen. Die `<!--[if mso]>`-Blöcke sind Outlook-only.
- **Logo auf weißer Kachel.** Unser Logo ist dunkel. Invertiert ein Client die
  Mail eigenmächtig, bliebe es sonst unsichtbar.
- **Vorschautext je Template.** Ohne ihn zeigen Gmail und Apple Mail in der
  Übersicht die erste Zeile des Fließtexts. Steht im Block `preheader`.
- **Ersatzlink unter jedem Button.** Manche Clients und Sicherheits-Gateways
  entfernen Buttons oder schreiben Links um.
- **Hochformat beachtet.** Das Logo ist 832×1088; das Directus-Original
  zeichnet ein 40×40-Quadrat, was es quetschen würde. Hier: 73×96.

## Ändern und prüfen

Ein Syntaxfehler legt **alle** System-Mails lahm — Directus wirft dann beim
Rendern und verschickt gar nichts. Deshalb vor dem Ausrollen lokal rendern:

```bash
npm install liquidjs --no-save
```

```bash
node -e "const{Liquid}=require('liquidjs'),fs=require('fs');const e=new Liquid({root:['./directus-templates'],extname:'.liquid'});Promise.all(['password-reset','user-invitation','user-registration'].map(n=>e.parseAndRender(fs.readFileSync('directus-templates/'+n+'.liquid','utf8'),{projectName:'SV Koweg e.V.',projectColor:'#161A4E',projectLogo:'https://cms.sv-koweg.de/assets/23e728f1-68a4-44d7-8736-f2907627491b',projectUrl:'https://www.sv-koweg.de',url:'https://example.test/token'}).then(o=>{fs.writeFileSync(n+'.html',o);console.log(n,o.length,'Zeichen')}))).catch(e=>{console.error(e.message);process.exit(1)})"
```

Schreibt drei HTML-Dateien, die sich im Browser ansehen lassen. Läuft das
durch, ist die Liquid-Syntax in Ordnung.

Der echte Test bleibt ein Versand an eine Adresse, die du selbst liest — am
besten einmal an Gmail und einmal an Outlook, die beiden mit den
eigenwilligsten Rendern.
