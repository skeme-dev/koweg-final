# SV Koweg – Design Tokens (für Claude-Design)

Kanonische Design-Tokens des Frontends, aufbereitet zur Wiederverwendung in Claude-Designs
(Artifacts, Mockups, Visualisierungen). Alle `color-mix()`-Werte sind zu **festen Hex-Werten**
aufgelöst, damit sie in eingeschränkten Umgebungen (CSP, ältere Renderer) funktionieren.

**Quelle:** `tailwind.config.ts`, `src/globals.css`, `src/fonts.css`
**Theme:** aktuell nur **Light** (die `.dark`-Variablen sind im Code auskommentiert).

## So nutzt Claude diese Tokens
- **Primärfarbe = `accent` `#161A4E`** (Marken-Navy): Header, Buttons, Links, Akzente.
- Fließtext auf Weiß: **`#000000`** (Haupt) oder **`gray-dark` `#42566E`** (sekundär, AAA).
- **`gray-muted` `#A5B0BD` NIE für Text** (Kontrast 2.2:1 – nur Rahmen/Deko/Disabled).
- Schrift überall **Quicksand**; Code **Fira Mono**.
- Auf farbigen Flächen (`accent`/`blue`): **weißer** Text (AAA).

## Farbpalette (aufgelöst)

### Marke
| Rolle | Hex | Einsatz |
| --- | --- | --- |
| `accent` (primary brand) | **#161A4E** | Buttons, Links, Header, Hover-Ziel |
| `accent-dark` (`secondary`) | **#0D102F** | Aktiv/Pressed, tiefere Flächen |
| `accent-soft` | **#454871** | gedämpfte Akzente, Borders |
| `accent-light` (`primary`*) | **#E8E8ED** | zarte Flächen/Hintergründe |
| `blue` | **#172940** | dunkle Sektionsflächen |

\* Achtung Namens-Falle: das Tailwind-Token `primary` = **accent-light** (sehr hell), `secondary` = **accent-dark**.

### Neutral
| Rolle | Hex | Einsatz |
| --- | --- | --- |
| `background` | **#FFFFFF** | Seitenhintergrund |
| `foreground` | **#000000** | Haupttext |
| `background-muted` | **#E6E6E6** | Code-/Card-Hintergrund |
| `input` | **#B3B3B3** | Input-Border/-Rahmen |
| `gray` | **#F5F8FB** | sehr helle Fläche |
| `gray-muted` | **#A5B0BD** | Deko/Border, **kein Text** |
| `gray-dark` | **#42566E** | Sekundärtext (AAA) |

### Utility
| Rolle | Hex | Einsatz |
| --- | --- | --- |
| Fokus-Ring | **#FFBF00** | `outline: 3px solid; offset 2px` |
| Hoher Kontrast (a11y) | bg **#000** / fg **#FFF** / accent **#FFFF00** | `html.a11y-high-contrast` |

## Kontrast (WCAG, Normaltext AA≥4.5 / AAA≥7)
| Paarung | Ratio | Urteil |
| --- | --- | --- |
| accent auf Weiß | 16.26:1 | AAA |
| accent auf gray (#F5F8FB) | 15.25:1 | AAA |
| gray-dark auf Weiß | 7.53:1 | AAA |
| foreground (#000) auf Weiß | 21.0:1 | AAA |
| Weiß auf accent (Button) | 16.26:1 | AAA |
| Weiß auf blue | 14.71:1 | AAA |
| **gray-muted auf Weiß** | **2.20:1** | **FAIL – kein Text** |
| **Fokus #FFBF00 auf Weiß** | **1.65:1** | **schwach als UI-Ring** |

> Hinweis: Der amber Fokus-Ring ist auf Weiß nur 1.65:1. Als 3px-Outline mit Offset gerade noch
> sichtbar, aber ein etwas dunklerer Ton (z. B. #B37A00) wäre robuster.

## Typografie
- **Familien:** `sans` / `heading` = **Quicksand**; `code` = **Fira Mono** (`Inter` ist geladen, aber im Theme nicht referenziert).
- **Gewichte (Quicksand, lokal):** 300 Light · 400 Regular · 500 Medium · 600 SemiBold · 700 Bold.

**Type-Scale (Tailwind `fontSize`, Größe / Line-Height):**
| Token | Größe | LH |
| --- | --- | --- |
| `h1` | 56px | 78.4px |
| `h2` | 36px | 50.4px |
| `h3` | 24px | 33.6px |
| `headline` | 36px | 64px |
| `tagline` | 24px | 33.6px |
| `description` | 16px | 22.4px |
| `regular` | 16px | 24px |
| `bold` / `nav` | 16px | 22.4px |
| `code` | 14px | 16.8px |

**Prose (Typography-Plugin, fluid):** h1 `clamp(2.5rem,5vw,3.5rem)`/400 · h2 `clamp(2rem,4vw,2.5rem)`/600 · h3 `clamp(1.5rem,3vw,2rem)`/400 · p `clamp(1rem,2vw,1.25rem)`/400, LH 1.75.

## Radius & Sonstiges
- Radius: **8px** (Bilder, `pre`, iframes, Cards), **4px** (Inline-`code`).
- Fokus: `outline: 3px solid #FFBF00; outline-offset: 2px`.

## Ready-to-paste CSS (`:root`, Light)
```css
:root {
  --background: #FFFFFF;
  --foreground: #000000;
  --accent: #161A4E;         /* Primärfarbe */
  --accent-dark: #0D102F;    /* secondary   */
  --accent-soft: #454871;
  --accent-light: #E8E8ED;   /* primary-Token */
  --blue: #172940;
  --gray: #F5F8FB;
  --gray-muted: #A5B0BD;     /* kein Text */
  --gray-dark: #42566E;      /* Sekundärtext */
  --background-muted: #E6E6E6;
  --input: #B3B3B3;
  --focus-ring: #FFBF00;
  --font-sans: 'Quicksand', sans-serif;
  --font-code: 'Fira Mono', monospace;
  --radius: 8px;
}
```

## JSON
```json
{
  "color": {
    "brand": { "accent": "#161A4E", "accentDark": "#0D102F", "accentSoft": "#454871", "accentLight": "#E8E8ED", "blue": "#172940" },
    "neutral": { "white": "#FFFFFF", "black": "#000000", "gray": "#F5F8FB", "grayMuted": "#A5B0BD", "grayDark": "#42566E", "backgroundMuted": "#E6E6E6", "input": "#B3B3B3" },
    "semantic": { "background": "#FFFFFF", "foreground": "#000000", "accent": "#161A4E", "focusRing": "#FFBF00" }
  },
  "font": {
    "family": { "sans": "Quicksand, sans-serif", "heading": "Quicksand, sans-serif", "code": "'Fira Mono', monospace" },
    "weight": { "light": 300, "regular": 400, "medium": 500, "semibold": 600, "bold": 700 }
  },
  "fontSize": {
    "h1": ["56px", "78.4px"], "h2": ["36px", "50.4px"], "h3": ["24px", "33.6px"],
    "headline": ["36px", "64px"], "tagline": ["24px", "33.6px"],
    "description": ["16px", "22.4px"], "regular": ["16px", "24px"], "code": ["14px", "16.8px"]
  },
  "radius": { "sm": "4px", "md": "8px" },
  "focus": { "outline": "3px solid #FFBF00", "offset": "2px" }
}
```

## Ergänzungen für vollständige Designs (NICHT im Code – Vorschlag)
Der Codebase-Stack hat außer `accent` keine Status-/Kategorie-Farben. Für Dashboards, Alerts oder
Charts harmonieren diese, alle **AA auf Weiß** und passend zum Navy:

| Rolle | Hex | auf Weiß |
| --- | --- | --- |
| success | **#1B7F5B** | 4.96 AA |
| warning | **#9A5A00** | 5.47 AA |
| error | **#C0392B** | 5.44 AA |
| info | **#1F6FB2** | 5.28 AA |
| Chart-Kategorien | #161A4E · #1F6FB2 · #1B7F5B · #9A5A00 · #7A4FA3 · #C0392B | Serien 1–6 (alle ≥4.5 auf Weiß) |
