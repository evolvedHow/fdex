import yaml from 'js-yaml';

export interface Legislator {
  id: string;
  name: string;
  party: string;
  image: string;
  email: string;
  phones: string[];
  addresses: string[];
  website: string;
  district: string;
  title: string;
  org_classification: string;
}

export interface LegislatorDb {
  generated_at: string;
  source: string;
  state_senate: Record<string, Legislator>;
  state_house:  Record<string, Legislator>;
  us_house:     Record<string, Legislator>;
  us_senate:    Legislator[];
}

type Chamber = 'congress' | 'senate' | 'house';

let dbCache: Promise<LegislatorDb | null> | null = null;

export function loadLegislators(): Promise<LegislatorDb | null> {
  if (dbCache) return dbCache;
  dbCache = (async () => {
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}data/legislators.yml`);
      if (!res.ok) return null;
      const text = await res.text();
      return yaml.load(text) as LegislatorDb;
    } catch (e) {
      console.error('[legislators] load failed', e);
      return null;
    }
  })();
  return dbCache;
}

// ── Point-in-polygon over enacted district GeoJSONs ─────────────────────
// Ray-casting; correct for GeoJSON MultiPolygon + holes. Coordinates are [lng, lat].

type Ring = [number, number][];

function pointInRing(pt: [number, number], ring: Ring): boolean {
  let inside = false;
  const [x, y] = pt;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersect = ((yi > y) !== (yj > y)) &&
      (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function pointInFeature(pt: [number, number], geom: any): boolean {
  if (!geom) return false;
  if (geom.type === 'Polygon') {
    const rings = geom.coordinates as Ring[];
    if (!rings.length || !pointInRing(pt, rings[0])) return false;
    for (let i = 1; i < rings.length; i++) if (pointInRing(pt, rings[i])) return false;
    return true;
  }
  if (geom.type === 'MultiPolygon') {
    for (const poly of geom.coordinates as Ring[][]) {
      if (!poly.length || !pointInRing(pt, poly[0])) continue;
      let inHole = false;
      for (let i = 1; i < poly.length; i++) {
        if (pointInRing(pt, poly[i])) { inHole = true; break; }
      }
      if (!inHole) return true;
    }
  }
  return false;
}

// Cache the enacted-plan feature collections by chamber.
const CURRENT_ENACTED: Record<Chamber, string> = {
  congress: 'congress_enacted_24_2024update.geojson',
  senate:   'senate_enacted_24_2024update.geojson',
  house:    'house_enacted_24_2024update.geojson',
};

const geoCache: Partial<Record<Chamber, Promise<any>>> = {};

async function loadPlan(chamber: Chamber): Promise<any> {
  let p = geoCache[chamber];
  if (!p) {
    p = (async () => {
      const res = await fetch(`${import.meta.env.BASE_URL}data/${CURRENT_ENACTED[chamber]}`);
      if (!res.ok) throw new Error(`plan fetch failed: ${chamber}`);
      return res.json();
    })();
    geoCache[chamber] = p;
  }
  return p;
}

export async function districtAtPoint(
  chamber: Chamber,
  lng: number,
  lat: number,
): Promise<string | null> {
  const geo = await loadPlan(chamber);
  for (const f of geo.features) {
    if (pointInFeature([lng, lat], f.geometry)) {
      const p = f.properties ?? {};
      const d = p.district ?? p.DISTRICT;
      return d != null ? String(Math.round(Number(d))) : null;
    }
  }
  return null;
}

export interface ResolvedReps {
  us_senate:  Legislator[];
  us_house:   Legislator | null;
  state_senate: Legislator | null;
  state_house:  Legislator | null;
  districts: { us_house: string | null; state_senate: string | null; state_house: string | null };
}

export async function resolveReps(lng: number, lat: number): Promise<ResolvedReps | null> {
  const db = await loadLegislators();
  if (!db) return null;
  const [cd, sd, hd] = await Promise.all([
    districtAtPoint('congress', lng, lat),
    districtAtPoint('senate',   lng, lat),
    districtAtPoint('house',    lng, lat),
  ]);
  return {
    us_senate: db.us_senate ?? [],
    us_house:   cd ? db.us_house[cd] ?? null : null,
    state_senate: sd ? db.state_senate[sd] ?? null : null,
    state_house:  hd ? db.state_house[hd] ?? null : null,
    districts: { us_house: cd, state_senate: sd, state_house: hd },
  };
}
