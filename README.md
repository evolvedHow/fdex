# fdex — Georgia Explorer

Consumer-facing interactive map for exploring Georgia's redistricting plans.
Part of the [Fair Districts GA](https://fairdistrictsga.org) toolset.

---

## Purpose

Georgia Explorer lets the public, advocates, and journalists:

- Browse every enacted, historical, and proposed redistricting plan for
  Georgia's Congressional, State House, and State Senate districts
- Toggle demographic overlays (Black VAP %, Hispanic VAP %, Asian VAP %,
  partisan lean) as choropleth layers on top of any plan
- Search for any Georgia address and see which district it falls in
- View per-district demographic and socioeconomic data in a slide-up drawer

The app is entirely static at runtime — no server, no API calls.  All data
is pre-built GeoJSON served alongside the JavaScript bundle.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Svelte 5 (runes / `$state`, `$derived`) |
| Build | Vite 6 |
| Language | TypeScript |
| Styling | Tailwind CSS 4 |
| Map | Mapbox GL JS 3.9 (vector tiles + GeoJSON layers) |
| Geocoder | @mapbox/mapbox-gl-geocoder 5 |
| Config | js-yaml (YAML config baked at build time) |
| Package manager | npm |
| Data processing | Python 3.12 + uv (fetch scripts only) |

---

## Directory Layout

```
fdex/
├── config/
│   ├── config.yml        ← Map centre, zoom, Mapbox style URL, geocoder bbox
│   └── maps.yml          ← 40+ plan definitions + overlay colour ramps
├── data/                 ← GeoJSON files served at /data/ (populated by fdp sync)
│   ├── congress_*.geojson
│   ├── house_*.geojson
│   ├── senate_*.geojson
│   ├── county.geojson
│   ├── places_2020data.geojson
│   └── demographics/
│       ├── congress.json ← ACS 5-year socioeconomic data by district
│       ├── house.json
│       └── senate.json
├── frontend/
│   ├── src/
│   │   ├── App.svelte              ← Root: loads config.json, mounts layout
│   │   └── lib/
│   │       ├── components/
│   │       │   ├── MapView.svelte      ← Mapbox GL map, layer management
│   │       │   ├── ControlBar.svelte   ← Plan selector, overlay toggles
│   │       │   ├── BottomDrawer.svelte ← Per-district demographic panel
│   │       │   ├── Legend.svelte       ← Choropleth colour legend
│   │       │   ├── SearchBar.svelte    ← Address geocoder
│   │       │   └── Sidebar.svelte      ← Collapsible info sidebar
│   │       ├── stores/
│   │       │   └── state.svelte.ts     ← Global app state (Svelte 5 runes)
│   │       └── types.ts                ← AppConfig, Plan, Overlay interfaces
│   ├── scripts/
│   │   ├── bake-config.mjs     ← Merges config.yml + maps.yml → public/config.json
│   │   └── copy-assets.mjs     ← Copies data/ + img/ into dist/ at postbuild
│   ├── public/
│   │   └── config.json         ← Baked at build (gitignored — contains token)
│   ├── vite.config.ts          ← Dev middleware serves ../data/ at /data/
│   └── package.json
├── scripts/
│   └── sync_data.sh            ← Pulls GeoJSON from fdp data platform
└── img/                        ← Logo + static images
```

---

## Setup

```bash
cd ~/codebox/fgdp/fdex/frontend
npm install
```

Create `fdex/.env`:

```env
VITE_MAPBOX_TOKEN=pk.eyJ1...   # Mapbox public token (restrict to your domain)
```

---

## Development

```bash
# Sync data from the platform first (only needed when data changes)
cd ~/codebox/fgdp/fdex/frontend
npm run sync       # → fdp sync-app fdex --dest ../data

# Start dev server
npm run dev        # → http://localhost:5173
```

The Vite config (`vite.config.ts`) includes a `serveLocalAssets` plugin that
intercepts `/data/*` and `/img/*` requests and serves them from `../data/` and
`../img/` respectively.  No symlinks required.

---

## Building for Production

```bash
cd ~/codebox/fgdp/fdex/frontend
npm run build
# prebuild: sync data + bake-config.mjs (config.yml + maps.yml → public/config.json)
# build:    vite build
# postbuild: copy-assets.mjs copies data/ + img/ into dist/
```

Output lands in `fdex/dist/` as a fully self-contained static site.

**`public/config.json` contains your Mapbox token.  It is gitignored.  Never commit it.**

---

## Configuration

### `config/config.yml`

Map initialisation — centre, zoom bounds, Mapbox style URL, geocoder bbox.

```yaml
map:
  center: [-83.2, 32.5]
  zoom: 5.5
  style: "mapbox://styles/fdgamaps/..."
  geocoder_bbox: [-85.6, 30.4, -80.8, 35.0]
```

### `config/maps.yml`

Two sections:

**`plans`** — every plan card in the Control Bar.  `file` references a GeoJSON
in `data/` (filename only, no path).

```yaml
plans:
  congress:
    - id: congress_enacted_24
      label: "2024 Enacted Congressional Map"
      file: congress_enacted_24_2024update.geojson
```

**`overlays`** — choropleth overlays.  `property` is the GeoJSON feature
property to colour by; `breaks` are the step thresholds.

```yaml
overlays:
  - id: bvap
    label: "Black VAP %"
    property: BVAP_PCT
    color_ramp: ["#f7f7f7", "#084594"]
    breaks: [0, 10, 20, 30, 40, 50, 100]
```

Both files are merged by `scripts/bake-config.mjs` into `public/config.json`
which the Svelte app fetches on startup.

---

## Data

Runtime data in `fdex/data/` is sourced from the Fair Districts Data Platform.

| File | Source | Contains |
|---|---|---|
| `congress_*.geojson` | GA General Assembly + FDGA | Congressional district polygons with BVAP%, HVAP%, AVAP%, DEM_PCT% embedded |
| `house_*.geojson` | Same | State House district polygons |
| `senate_*.geojson` | Same | State Senate district polygons |
| `county.geojson` | Census TIGER | County boundaries |
| `places_2020data.geojson` | Census TIGER | Incorporated place boundaries |
| `demographics/congress.json` | ACS 5-year + PL 94-171 | Median income, poverty, education, VAP by race per district |

### Refreshing demographic data

```bash
cd ~/codebox/fdp
uv run python scripts/fetch_demographics.py   # requires CENSUS_API_KEY in .env
cd ~/codebox/fgdp/fdex/frontend && npm run sync
```

---

## Mapbox Notes

- **Style:** Private Mapbox style on `fdgamaps` account.  Style URL is in
  `config/config.yml`.  When switching accounts, update style URL and `.env` token.
- **Vector tilesets:** Three district-boundary tilesets are also hosted on
  `fdgamaps`.  They must stay on the same account as the token.
- **Choropleth expressions:** Mapbox GL JS v3 requires `step` expressions for
  choropleth colours.  The legacy `{property, stops}` object format silently
  fails.  The `stopsToStep()` helper in `mapLayers.ts` converts config ramps.

---

## Deployment (GitHub Pages)

```bash
cd frontend
npm run build
# Push dist/ to gh-pages branch, or use GitHub Actions
```

Set `BASE_PATH=/fdex/` (or repo name) in the Actions env so Vite generates
correct asset paths.  Leave unset for local builds.

---

## FDP Integration

```
fdp/config/apps/fdex.yml  ← authoritative plan catalogue and overlay definitions
fdp/data/repos/main/      ← canonical GeoJSON source
fdex/scripts/sync_data.sh ← copies fdp files into fdex/data/
```

To test with a workspace (e.g. a new shapefile):
```bash
fdp workspace create test_congress --base main
cp ~/new_congress.geojson ~/codebox/fgdp/fdp/data/workspaces/test_congress/boundaries/congress/
FDP_WORKSPACE=test_congress npm run sync && npm run dev
```
