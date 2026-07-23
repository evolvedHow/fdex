#!/usr/bin/env python3
"""Build fdex/data/legislators.yml from OpenStates v3.

Fetches Georgia state legislators (upper + lower), plus U.S. House
representatives and both U.S. Senators for Georgia. Writes a YAML file
the frontend loads at runtime to power the Contact panel.

Requires OPENSTATES_API_KEY in fdex/.env (get one at openstates.org/accounts/profile/).

Usage:
    cd ~/codebox/fgdp/fdex
    uv run --with pyyaml python scripts/build_legislators.py
    # or: python scripts/build_legislators.py

Rate limit: OpenStates free tier is ~500 req/day and 10 req/sec. This
script issues ~5 calls for state legislators + 14 geo lookups (one per
GA congressional district) — well under the limit.
"""
from __future__ import annotations

import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

try:
    import yaml
except ImportError:
    sys.stderr.write("Missing dep: pip install pyyaml (or `uv run --with pyyaml …`)\n")
    sys.exit(1)


ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
OUT = DATA_DIR / "legislators.yml"

OPENSTATES_BASE = "https://v3.openstates.org"
GA_JURISDICTION = "ocd-jurisdiction/country:us/state:ga/government"

CONGRESS_GEOJSON = DATA_DIR / "congress_enacted_24_2024update.geojson"


def load_env() -> dict[str, str]:
    env: dict[str, str] = {}
    envfile = ROOT / ".env"
    if envfile.exists():
        for line in envfile.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, _, v = line.partition("=")
            env[k.strip()] = v.strip().strip("'").strip('"')
    env.update(os.environ)
    return env


def http_get(url: str, api_key: str, retries: int = 5) -> dict:
    req = urllib.request.Request(url, headers={"X-API-Key": api_key})
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.loads(r.read())
        except urllib.error.HTTPError as e:
            if e.code == 429 and attempt < retries - 1:
                # OpenStates enforces 10 req/min; wait long enough for a
                # fresh window. Respect Retry-After if provided.
                retry_after = e.headers.get("Retry-After")
                wait = int(retry_after) if retry_after and retry_after.isdigit() else 65
                sys.stderr.write(f"  rate-limited, waiting {wait}s\n")
                time.sleep(wait)
                continue
            body = e.read().decode("utf-8", errors="replace")[:300]
            raise SystemExit(f"HTTP {e.code} on {url}\n{body}") from e
    raise SystemExit(f"exhausted retries on {url}")


# OpenStates free tier caps at 10 requests/minute. Sleep enough between
# calls to stay under the limit with margin (10/min = 6s each; use 7s).
RATE_LIMIT_SLEEP_S = 7.0


def clean_district(v) -> str:
    """Normalize district identifiers so "14.0" (float from geojson) and
    "14" (int/str from OpenStates) collide on the same key."""
    if v is None:
        return ""
    s = str(v).strip()
    if not s:
        return ""
    try:
        f = float(s)
        if f.is_integer():
            return str(int(f))
    except ValueError:
        pass
    return s


def normalize_person(p: dict) -> dict:
    """Reduce an OpenStates person record to just the fields fdex needs."""
    offices = p.get("offices") or []
    email = p.get("email") or ""
    phones: list[str] = []
    addresses: list[str] = []
    for o in offices:
        if o.get("voice"):
            phones.append(f"{o.get('classification', 'office')}: {o['voice']}")
        if o.get("address"):
            addresses.append(f"{o.get('classification', 'office')}: {o['address']}")

    role = p.get("current_role") or {}
    return {
        "id": p.get("id"),
        "name": p.get("name"),
        "party": p.get("party"),
        "image": p.get("image") or "",
        "email": email,
        "phones": phones,
        "addresses": addresses,
        "website": p.get("openstates_url") or "",
        "district": clean_district(role.get("district")),
        "title": role.get("title") or "",
        "org_classification": role.get("org_classification") or "",
    }


def fetch_state_legislators(api_key: str) -> tuple[dict, dict]:
    """Return (state_senate, state_house) dicts keyed by district string."""
    senate: dict[str, dict] = {}
    house: dict[str, dict] = {}
    page = 1
    while True:
        qs = urllib.parse.urlencode({
            "jurisdiction": GA_JURISDICTION,
            "include": "offices",
            "per_page": 50,
            "page": page,
        })
        url = f"{OPENSTATES_BASE}/people?{qs}"
        sys.stderr.write(f"  fetching state legislators page {page}\n")
        data = http_get(url, api_key)
        for p in data.get("results", []):
            n = normalize_person(p)
            org = n["org_classification"]
            key = n["district"]
            if not key:
                continue
            if org == "upper":
                senate[key] = n
            elif org == "lower":
                house[key] = n
        pag = data.get("pagination", {})
        if page >= pag.get("max_page", 1):
            break
        page += 1
        time.sleep(RATE_LIMIT_SLEEP_S)  # be polite
    return senate, house


def polygon_centroid(coords: list) -> tuple[float, float]:
    """Very rough centroid: mean of exterior-ring vertices. Fine for /people.geo."""
    pts: list[tuple[float, float]] = []

    def walk(c):
        if isinstance(c, list) and c and isinstance(c[0], (int, float)):
            pts.append((c[0], c[1]))
        elif isinstance(c, list):
            for sub in c:
                walk(sub)

    walk(coords)
    if not pts:
        return (0.0, 0.0)
    n = len(pts)
    return (sum(p[0] for p in pts) / n, sum(p[1] for p in pts) / n)


def fetch_us_congress(api_key: str) -> tuple[dict, list]:
    """Return (us_house dict keyed by GA CD, us_senate list) using /people.geo
    at each GA congressional-district centroid."""
    if not CONGRESS_GEOJSON.exists():
        raise SystemExit(f"missing {CONGRESS_GEOJSON}; sync data first")
    geo = json.loads(CONGRESS_GEOJSON.read_text())

    us_house: dict[str, dict] = {}
    us_senate_by_id: dict[str, dict] = {}

    for feat in geo["features"]:
        props = feat.get("properties") or {}
        district = clean_district(props.get("district") or props.get("DISTRICT"))
        if not district:
            continue
        lng, lat = polygon_centroid(feat["geometry"]["coordinates"])
        qs = urllib.parse.urlencode({"lat": f"{lat:.6f}", "lng": f"{lng:.6f}", "include": "offices"})
        url = f"{OPENSTATES_BASE}/people.geo?{qs}"
        sys.stderr.write(f"  /people.geo for CD-{district} @ ({lat:.3f},{lng:.3f})\n")
        data = http_get(url, api_key)
        for p in data.get("results", []):
            role = p.get("current_role") or {}
            div = (role.get("division_id") or "")
            if "/country:us/state:ga" not in div:
                # geocentroid can spill into a neighbouring state for coastal
                # districts; skip anything not Georgia-scoped
                continue
            n = normalize_person(p)
            if "/cd:" in div and role.get("org_classification") == "lower":
                us_house[clean_district(role.get("district") or district)] = n
            elif role.get("org_classification") == "upper":
                # both US Senators are statewide; dedupe by openstates id
                us_senate_by_id[n["id"]] = n
        time.sleep(RATE_LIMIT_SLEEP_S)

    return us_house, list(us_senate_by_id.values())


def main() -> None:
    env = load_env()
    api_key = env.get("OPENSTATES_API_KEY")
    if not api_key:
        sys.stderr.write(
            "OPENSTATES_API_KEY not set. Request a free key at\n"
            "  https://openstates.org/accounts/profile/\n"
            "and add it to fdex/.env as OPENSTATES_API_KEY=...\n"
        )
        sys.exit(1)

    sys.stderr.write("Fetching Georgia state legislators…\n")
    senate, house = fetch_state_legislators(api_key)
    sys.stderr.write(f"  senate: {len(senate)} · house: {len(house)}\n")

    sys.stderr.write("Fetching U.S. Congress members for Georgia…\n")
    us_house, us_senate = fetch_us_congress(api_key)
    sys.stderr.write(f"  us_house: {len(us_house)} · us_senate: {len(us_senate)}\n")

    payload = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "source": "openstates.org v3",
        "state_senate": senate,
        "state_house": house,
        "us_house": us_house,
        "us_senate": us_senate,
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    with OUT.open("w") as f:
        yaml.safe_dump(payload, f, sort_keys=False, allow_unicode=True, width=100)
    sys.stderr.write(f"Wrote {OUT} ({OUT.stat().st_size / 1024:.1f} KB)\n")


if __name__ == "__main__":
    main()
