#!/usr/bin/env python3
"""Fetch Census ACS 5-year demographic data for Georgia legislative districts.

Output: data/demographics/{congress,senate,house}.json
Each file is a dict keyed by district number (string "1".."N") containing
derived demographic rates and counts suitable for the fdex tooltip.

Usage:
    python scripts/fetch_district_demographics.py            # all chambers
    python scripts/fetch_district_demographics.py congress   # one chamber
    python scripts/fetch_district_demographics.py --year 2022

No Census API key is required for < 500 requests/day.
Set CENSUS_API_KEY in .env for higher rate limits.

To add other datasets (e.g. from data.gov):
  1. Create a similar script in scripts/ that outputs to data/<dataset>/<chamber>.json
  2. Add a backend endpoint in backend/main.py
  3. Fetch from the frontend in MapView.svelte and display in Sidebar.svelte
"""
import json
import os
import sys
import urllib.request
import urllib.parse
from pathlib import Path

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
STATE_FIPS = "13"   # Georgia
DEFAULT_YEAR = "2022"

# ACS 5-year variables to fetch
# Format: { census_variable_id: internal_name }
VARIABLES: dict[str, str] = {
    "B01003_001E": "total_pop",
    "B01001_002E": "male_pop",
    "B01001_026E": "female_pop",
    "B19013_001E": "median_hh_income",
    "B17001_001E": "poverty_universe",
    "B17001_002E": "poverty_count",
    "B15003_001E": "edu_universe",       # population 25+
    "B15003_022E": "edu_bachelors",
    "B15003_023E": "edu_masters",
    "B15003_024E": "edu_professional",
    "B15003_025E": "edu_doctorate",
    "B11001_001E": "total_households",
    "B11001_003E": "married_couple_hh",
    "B11001_006E": "male_single_parent",
    "B11001_009E": "female_single_parent",
    # Vehicle ownership (B08201: Household Size by Vehicles Available)
    "B08201_001E": "vehicle_hh_universe",
    "B08201_002E": "no_vehicle_hh",
    # Health insurance (B27010: Types of Health Insurance Coverage by Age)
    "B27010_001E": "insurance_universe",
    "B27010_017E": "uninsured_under19",  # under 19: no coverage
    "B27010_033E": "uninsured_19_34",    # 19-34: no coverage
    "B27010_050E": "uninsured_35_64",    # 35-64: no coverage
    "B27010_066E": "uninsured_65plus",   # 65+: no coverage
    # Unemployment (B23025: Employment Status for Population 16+)
    "B23025_003E": "labor_force",
    "B23025_005E": "unemployed",
}

# Census geographic levels and the key column they return
CHAMBERS: dict[str, tuple[str, str]] = {
    "congress": (
        f"congressional+district:*&in=state:{STATE_FIPS}",
        "congressional district",
    ),
    "senate": (
        f"state+legislative+district+%28upper+chamber%29:*&in=state:{STATE_FIPS}",
        "state legislative district (upper chamber)",
    ),
    "house": (
        f"state+legislative+district+%28lower+chamber%29:*&in=state:{STATE_FIPS}",
        "state legislative district (lower chamber)",
    ),
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def safe_int(val: str | None, default: int = 0) -> int:
    try:
        v = int(val or 0)
        return v if v >= 0 else default
    except (TypeError, ValueError):
        return default


def fetch_acs(chamber: str, year: str, api_key: str | None) -> dict:
    geo_param, dist_col = CHAMBERS[chamber]
    var_str = ",".join(VARIABLES.keys())
    url = (
        f"https://api.census.gov/data/{year}/acs/acs5"
        f"?get={var_str}&for={geo_param}"
    )
    if api_key:
        url += f"&key={api_key}"

    req = urllib.request.Request(url, headers={"User-Agent": "fdex/1.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read())

    headers: list[str] = data[0]
    result: dict[str, dict] = {}

    for row in data[1:]:
        record = dict(zip(headers, row))
        dist_num = int(record[dist_col])

        total_pop    = safe_int(record.get("B01003_001E"))
        male_pop     = safe_int(record.get("B01001_002E"))
        female_pop   = safe_int(record.get("B01001_026E"))
        median_inc   = safe_int(record.get("B19013_001E"), default=-1)
        pov_universe = safe_int(record.get("B17001_001E"))
        pov_count    = safe_int(record.get("B17001_002E"))
        edu_universe = safe_int(record.get("B15003_001E"))
        edu_bach     = safe_int(record.get("B15003_022E"))
        edu_mast     = safe_int(record.get("B15003_023E"))
        edu_prof     = safe_int(record.get("B15003_024E"))
        edu_doc      = safe_int(record.get("B15003_025E"))
        total_hh     = safe_int(record.get("B11001_001E"))
        married_hh   = safe_int(record.get("B11001_003E"))
        male_sp      = safe_int(record.get("B11001_006E"))
        female_sp    = safe_int(record.get("B11001_009E"))
        vehicle_hh_u = safe_int(record.get("B08201_001E"))
        no_vehicle   = safe_int(record.get("B08201_002E"))
        ins_universe = safe_int(record.get("B27010_001E"))
        uninsured    = (safe_int(record.get("B27010_017E")) +
                        safe_int(record.get("B27010_033E")) +
                        safe_int(record.get("B27010_050E")) +
                        safe_int(record.get("B27010_066E")))
        labor_force  = safe_int(record.get("B23025_003E"))
        unemployed   = safe_int(record.get("B23025_005E"))

        bach_plus_count = edu_bach + edu_mast + edu_prof + edu_doc
        single_parent   = male_sp + female_sp

        result[str(dist_num)] = {
            "median_income":       median_inc if median_inc > 0 else None,
            "pct_poverty":         round(pov_count    / pov_universe, 4) if pov_universe > 0 else None,
            "poverty_count":       pov_count,
            "pct_bachelors_plus":  round(bach_plus_count / edu_universe, 4) if edu_universe > 0 else None,
            "bachelors_plus_count": bach_plus_count,
            "pct_male":            round(male_pop    / total_pop, 4) if total_pop > 0 else None,
            "pct_female":          round(female_pop  / total_pop, 4) if total_pop > 0 else None,
            "pct_married_family":  round(married_hh  / total_hh, 4) if total_hh > 0 else None,
            "married_hh_count":    married_hh,
            "pct_single_parent":   round(single_parent / total_hh, 4) if total_hh > 0 else None,
            "single_parent_count": single_parent,
            "pct_no_vehicle":      round(no_vehicle   / vehicle_hh_u, 4) if vehicle_hh_u > 0 else None,
            "no_vehicle_count":    no_vehicle,
            "pct_uninsured":       round(uninsured    / ins_universe, 4) if ins_universe > 0 else None,
            "uninsured_count":     uninsured,
            "pct_unemployed":      round(unemployed   / labor_force,  4) if labor_force  > 0 else None,
            "unemployed_count":    unemployed,
            "labor_force_count":   labor_force,
        }

    return result


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main() -> None:
    args = sys.argv[1:]
    year = DEFAULT_YEAR
    chambers_to_fetch = list(CHAMBERS.keys())

    for a in args:
        if a.startswith("--year="):
            year = a.split("=", 1)[1]
        elif a in CHAMBERS:
            chambers_to_fetch = [a]
        elif a.startswith("--year"):
            pass  # next arg will be the value; simple enough to ignore for now

    api_key = os.getenv("CENSUS_API_KEY")
    out_dir = Path(__file__).parent.parent / "data" / "demographics"
    out_dir.mkdir(parents=True, exist_ok=True)

    for chamber in chambers_to_fetch:
        print(f"Fetching ACS {year} — {chamber}...", end=" ", flush=True)
        try:
            data = fetch_acs(chamber, year, api_key)
            out_path = out_dir / f"{chamber}.json"
            with open(out_path, "w") as f:
                json.dump(data, f, indent=2)
            print(f"{len(data)} districts → {out_path}")
        except Exception as exc:
            print(f"FAILED: {exc}", file=sys.stderr)


if __name__ == "__main__":
    main()
