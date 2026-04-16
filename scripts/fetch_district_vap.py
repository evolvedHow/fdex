#!/usr/bin/env python3
"""Fetch 2020 Census P.L. 94-171 VAP-by-race data for Georgia legislative districts.

Source
------
U.S. Census Bureau, 2020 Census Redistricting Data (P.L. 94-171)
API endpoint : https://api.census.gov/data/2020/dec/pl
Variable list: https://api.census.gov/data/2020/dec/pl/variables.html

Tables used
-----------
P3 – Race for the Voting-Age Population (18 years and over); 71 categories
P4 – Hispanic or Latino, and Not Hispanic or Latino by Race, VAP; parallel structure

Why "any-part Black"
--------------------
The Voting Rights Act (52 U.S.C. §10301) and the Gingles preconditions require
counting a person as "Black" if they selected Black alone OR Black in combination
with any other race.  Counting only "Black alone" (P3_004N) understates the
Black voting-age population relevant to minority representation analysis.

This script fetches all 32 P3 race-combination categories that include any
Black identity, sums them to produce the VRA-appropriate metric, then compares
that figure to the existing `bvap` values in the GeoJSON files to determine
whether the current data uses Black-alone or any-part-Black.

Limitation – post-redistricting maps
-------------------------------------
The Census 2020 PL API returns data for district boundaries **as defined on
January 1, 2020** (before the 2021 redistricting).  The enacted 2021+ and
proposed maps use new boundaries that don't match Census-defined geographies,
so the Census API cannot provide correct block-attributed data for them.

Correct VAP for those maps requires aggregating Census 2020 block-level PL data
(downloaded from the Census FTP: https://www2.census.gov/programs-surveys/decennial/2020/data/01-Redistricting_File--PL_94-171/Georgia/)
to the new district boundaries via a spatial join.  That workflow is out of
scope for this script.  Files affected are flagged with a warning below.

Usage
-----
    python scripts/fetch_district_vap.py             # compare + patch matched files
    python scripts/fetch_district_vap.py --dry-run   # compare only, no file writes

No Census API key is required for < 500 requests/day.
Set CENSUS_API_KEY in .env for higher rate limits.
"""

import json
import os
import sys
import urllib.request
from pathlib import Path

STATE_FIPS = "13"  # Georgia

# ---------------------------------------------------------------------------
# P3 variables: all combinations that include "Black or African American"
#
# P3 encodes 63 racial combinations (C(6,1)+C(6,2)+...+C(6,6)) across 71
# variable slots (extra slots are sub-group totals).  The six race codes are:
#   W = White          B = Black or African American   I = AIAN
#   A = Asian          H = NHPI                        O = Some Other Race
#
# Combinations are listed in lexicographic order within each n-race group.
# Each entry below is verified against the official 2020 PL variable list.
# ---------------------------------------------------------------------------

# 1 variable: Black alone
# 5 variables: 2-race combos containing Black  (C(5,1) = 5)
# 10 variables: 3-race combos                  (C(5,2) = 10)
# 10 variables: 4-race combos                  (C(5,3) = 10)
# 5 variables: 5-race combos                   (C(5,4) = 5)
# 1 variable: 6-race combo                     (C(5,5) = 1)
# ─────────────────────────────────────────────────────────
# Total: 32 variables

ANY_PART_BLACK = [
    # ── 1-race ──────────────────────────────────────────────────────────────
    "P3_004N",  # Black alone

    # ── 2-race ──────────────────────────────────────────────────────────────
    "P3_011N",  # White; Black
    "P3_016N",  # Black; AIAN
    "P3_017N",  # Black; Asian
    "P3_018N",  # Black; NHPI
    "P3_019N",  # Black; Some Other Race

    # ── 3-race ──────────────────────────────────────────────────────────────
    "P3_027N",  # White; Black; AIAN
    "P3_028N",  # White; Black; Asian
    "P3_029N",  # White; Black; NHPI
    "P3_030N",  # White; Black; Some Other Race
    "P3_037N",  # Black; AIAN; Asian
    "P3_038N",  # Black; AIAN; NHPI
    "P3_039N",  # Black; AIAN; Some Other Race
    "P3_040N",  # Black; Asian; NHPI
    "P3_041N",  # Black; Asian; Some Other Race
    "P3_042N",  # Black; NHPI; Some Other Race

    # ── 4-race ──────────────────────────────────────────────────────────────
    "P3_048N",  # White; Black; AIAN; Asian
    "P3_049N",  # White; Black; AIAN; NHPI
    "P3_050N",  # White; Black; AIAN; Some Other Race
    "P3_051N",  # White; Black; Asian; NHPI
    "P3_052N",  # White; Black; Asian; Some Other Race
    "P3_053N",  # White; Black; NHPI; Some Other Race
    "P3_058N",  # Black; AIAN; Asian; NHPI
    "P3_059N",  # Black; AIAN; Asian; Some Other Race
    "P3_060N",  # Black; AIAN; NHPI; Some Other Race
    "P3_061N",  # Black; Asian; NHPI; Some Other Race

    # ── 5-race ──────────────────────────────────────────────────────────────
    "P3_064N",  # White; Black; AIAN; Asian; NHPI
    "P3_065N",  # White; Black; AIAN; Asian; Some Other Race
    "P3_066N",  # White; Black; AIAN; NHPI; Some Other Race
    "P3_067N",  # White; Black; Asian; NHPI; Some Other Race
    "P3_069N",  # Black; AIAN; Asian; NHPI; Some Other Race

    # ── 6-race ──────────────────────────────────────────────────────────────
    "P3_071N",  # White; Black; AIAN; Asian; NHPI; Some Other Race
]
assert len(ANY_PART_BLACK) == 32, f"Expected 32 vars, got {len(ANY_PART_BLACK)}"

# Other VAP variables we fetch alongside
TOTAL_VAP    = "P3_001N"  # Total voting-age population (18+)
BLACK_ALONE  = "P3_004N"  # Black or African American alone (also in ANY_PART_BLACK)
ASIAN_ALONE  = "P3_006N"  # Asian alone
HISPANIC_VAP = "P4_002N"  # Hispanic or Latino VAP (P4 table)
NH_WHITE_VAP = "P4_005N"  # Not Hispanic; White alone

# All variables to request in one Census API call (35 total, within 50-var limit)
ALL_VARS = list(dict.fromkeys([TOTAL_VAP, NH_WHITE_VAP, HISPANIC_VAP, ASIAN_ALONE] + ANY_PART_BLACK))

# ---------------------------------------------------------------------------
# Census geographic levels
# Maps chamber name → (geo query string, district column name in API response)
# and the GeoJSON files whose boundaries match 2020 Census-defined districts.
# ---------------------------------------------------------------------------
CHAMBERS: dict[str, dict] = {
    "congress": {
        "geo": f"congressional+district:*&in=state:{STATE_FIPS}",
        "col": "congressional district",
        # 2020 Census used pre-2021 congressional boundaries (the 2011 map)
        "geojson_matches": ["congress12_census20.geojson"],
        "geojson_no_match": [
            "congress_enacted_2123_2024update.geojson",
            "congress_enacted_24_2024update.geojson",
            "congress_remedy_2.geojson",
            "congress21_census20.geojson",
            "congress21_p2.geojson",
        ],
    },
    "senate": {
        "geo": f"state+legislative+district+%28upper+chamber%29:*&in=state:{STATE_FIPS}",
        "col": "state legislative district (upper chamber)",
        "geojson_matches": ["senate14_census20.geojson"],
        "geojson_no_match": [
            "senate_enacted_2123_2024update.geojson",
            "senate_enacted_24_2024update.geojson",
            "senate_prop1_dem.geojson",
            "senate_prop2_rep.geojson",
            "senate_remedy_2.geojson",
        ],
    },
    "house": {
        "geo": f"state+legislative+district+%28lower+chamber%29:*&in=state:{STATE_FIPS}",
        "col": "state legislative district (lower chamber)",
        "geojson_matches": ["house15_census20.geojson"],
        "geojson_no_match": [
            "house_enacted_2123_2024update.geojson",
            "house_enacted_24_2024update.geojson",
            "house_prop1_dem.geojson",
            "house_prop2_rep.geojson",
            "house_remedy_1_2024update.geojson",
            "house_remedy_2.geojson",
        ],
    },
}


# ---------------------------------------------------------------------------
# Census API fetch
# ---------------------------------------------------------------------------
def fetch_pl_vap(chamber: str, api_key: str | None) -> dict[str, dict]:
    """Return {district_num_str: {total_vap, black_alone, any_part_black, ...}}"""
    geo = CHAMBERS[chamber]["geo"]
    col = CHAMBERS[chamber]["col"]
    var_str = ",".join(ALL_VARS)

    url = f"https://api.census.gov/data/2020/dec/pl?get={var_str}&for={geo}"
    if api_key:
        url += f"&key={api_key}"

    req = urllib.request.Request(url, headers={"User-Agent": "fdex/1.0"})
    with urllib.request.urlopen(req, timeout=60) as resp:
        data = json.loads(resp.read())

    headers: list[str] = data[0]
    result: dict[str, dict] = {}

    for row in data[1:]:
        rec = dict(zip(headers, row))
        dist = str(int(rec[col]))

        def vi(var: str) -> int:
            try:
                v = int(rec.get(var) or 0)
                return max(v, 0)
            except (TypeError, ValueError):
                return 0

        total_vap    = vi(TOTAL_VAP)
        black_alone  = vi(BLACK_ALONE)
        any_part_bvap = sum(vi(v) for v in ANY_PART_BLACK)
        asian_alone  = vi(ASIAN_ALONE)
        hispanic_vap = vi(HISPANIC_VAP)
        nh_white_vap = vi(NH_WHITE_VAP)

        result[dist] = {
            "total_vap":     total_vap,
            "black_alone":   black_alone,
            "any_part_bvap": any_part_bvap,
            "asian_alone":   asian_alone,
            "hispanic_vap":  hispanic_vap,
            "nh_white_vap":  nh_white_vap,
            "pct_black_alone":    round(black_alone  / total_vap, 4) if total_vap else 0,
            "pct_any_part_black": round(any_part_bvap / total_vap, 4) if total_vap else 0,
        }

    return result


# ---------------------------------------------------------------------------
# Compare Census data to existing GeoJSON
# ---------------------------------------------------------------------------
def compare_and_patch(
    census: dict[str, dict],
    geojson_path: Path,
    dry_run: bool,
) -> tuple[str, int]:
    """
    Load a GeoJSON, compare its bvap/pct_bvp to Census data,
    determine which metric it uses, optionally patch to any-part-Black.

    Returns (verdict_string, patched_count).
    """
    with open(geojson_path) as f:
        gj = json.load(f)

    diffs_alone: list[float] = []
    diffs_any:   list[float] = []
    patched = 0

    for feat in gj["features"]:
        p = feat.get("properties") or {}
        dist = str(int(float(p.get("district") or p.get("DISTRICT") or 0)))
        if dist not in census:
            continue

        cen = census[dist]
        existing_pct = float(p.get("pct_bvp") or 0)
        existing_raw = float(p.get("bvap") or 0)

        diffs_alone.append(abs(existing_pct - cen["pct_black_alone"]))
        diffs_any.append(  abs(existing_pct - cen["pct_any_part_black"]))

        if not dry_run:
            # Patch to any-part-Black
            old_pct  = p.get("pct_bvp")
            old_raw  = p.get("bvap")
            new_pct  = cen["pct_any_part_black"]
            new_raw  = cen["any_part_bvap"]
            if old_pct != new_pct or old_raw != new_raw:
                feat["properties"]["pct_bvp"] = new_pct
                feat["properties"]["bvap"]    = new_raw
                patched += 1

    if not diffs_alone:
        return "no matching districts found", 0

    avg_err_alone = sum(diffs_alone) / len(diffs_alone)
    avg_err_any   = sum(diffs_any)   / len(diffs_any)

    if avg_err_alone < avg_err_any:
        verdict = f"CURRENT = Black alone  (avg Δ alone={avg_err_alone:.4f}  any={avg_err_any:.4f})"
    elif avg_err_any < avg_err_alone:
        verdict = f"CURRENT = Any-part Black  (avg Δ alone={avg_err_alone:.4f}  any={avg_err_any:.4f})"
    else:
        verdict = f"AMBIGUOUS  (avg Δ alone={avg_err_alone:.4f}  any={avg_err_any:.4f})"

    if not dry_run and patched > 0:
        with open(geojson_path, "w") as f:
            json.dump(gj, f)
        verdict += f"  →  patched {patched} features to any-part-Black"

    return verdict, patched


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main() -> None:
    dry_run = "--dry-run" in sys.argv
    api_key = os.getenv("CENSUS_API_KEY")

    data_dir = Path(__file__).parent.parent / "data"
    out_dir  = Path(__file__).parent.parent / "data" / "vap_reference"
    if not dry_run:
        out_dir.mkdir(parents=True, exist_ok=True)

    print("=" * 70)
    print("fdex VAP audit — 2020 Census PL 94-171")
    print(f"Mode: {'DRY RUN (no file writes)' if dry_run else 'LIVE (will patch GeoJSONs)'}")
    print("=" * 70)

    for chamber, cfg in CHAMBERS.items():
        print(f"\n── {chamber.upper()} ──────────────────────────────────")
        print(f"  Fetching Census 2020 PL P3/P4 for GA {chamber} districts …", end=" ", flush=True)
        try:
            census = fetch_pl_vap(chamber, api_key)
            print(f"{len(census)} districts")
        except Exception as exc:
            print(f"FAILED: {exc}")
            continue

        # Save reference data regardless of dry-run
        if not dry_run:
            ref_path = out_dir / f"{chamber}.json"
            with open(ref_path, "w") as f:
                json.dump(census, f, indent=2)
            print(f"  Saved reference → {ref_path.relative_to(data_dir.parent)}")

        # Sample output for one district
        sample_dist = sorted(census.keys(), key=int)[0]
        s = census[sample_dist]
        print(f"  Sample — District {sample_dist}:")
        print(f"    Total VAP:       {s['total_vap']:,}")
        print(f"    Black alone:     {s['black_alone']:,}  ({s['pct_black_alone']:.1%})")
        print(f"    Any-part Black:  {s['any_part_bvap']:,}  ({s['pct_any_part_black']:.1%})")
        delta_pct = (s['any_part_bvap'] - s['black_alone']) / s['total_vap'] if s['total_vap'] else 0
        print(f"    Δ (any−alone):  +{s['any_part_bvap'] - s['black_alone']:,} people ({delta_pct:+.1%} of VAP)")

        # Compare to GeoJSON files with matching boundaries
        print(f"\n  Census-boundary GeoJSON files (can be patched):")
        for fname in cfg["geojson_matches"]:
            path = data_dir / fname
            if not path.exists():
                print(f"    ⚠  {fname}  — file not found, skipping")
                continue
            verdict, _ = compare_and_patch(census, path, dry_run)
            print(f"    {fname}")
            print(f"      {verdict}")

        # Warn about post-redistricting files
        if cfg["geojson_no_match"]:
            print(f"\n  ⚠  Post-redistricting files (Census API boundaries don't apply):")
            for fname in cfg["geojson_no_match"]:
                path = data_dir / fname
                status = "exists" if path.exists() else "not found"
                print(f"    {fname}  [{status}]")
            print()
            print("  These files need block-level Census PL aggregation to a spatial join.")
            print("  Download GA block-level PL data from:")
            print("    https://www2.census.gov/programs-surveys/decennial/2020/data/")
            print("    01-Redistricting_File--PL_94-171/Georgia/")
            print("  Then use geopandas to spatially join blocks to the new district")
            print("  boundaries and sum P3_004N (alone) + combination codes as above.")

    print("\n" + "=" * 70)
    if dry_run:
        print("DRY RUN complete.  Re-run without --dry-run to patch GeoJSON files.")
    else:
        print("Done.  GeoJSON files with Census-matching boundaries have been patched.")
        print("Check data/vap_reference/ for the raw Census numbers.")
    print("=" * 70)


if __name__ == "__main__":
    main()
