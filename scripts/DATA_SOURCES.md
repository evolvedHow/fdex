# fdex Data Sources

This document records the origin of every data field used in the fdex map.
Update this file whenever data is re-fetched or a field definition changes.

---

## GeoJSON District Boundaries and VAP / Race Fields

**Status: source partially unknown — see open issue below.**

The GeoJSON files in `data/` embed census-derived demographic fields alongside
district geometry and election results. The fields and their likely sources are:

| Field | Description | Source | Metric |
|---|---|---|---|
| `pop` | Total population | 2020 Census PL 94-171, P1_001N | — |
| `tvap` | Total voting-age population (18+) | 2020 Census PL 94-171, P3_001N | — |
| `wvap` | White VAP count | 2020 Census PL 94-171 | Unknown — see note |
| `pct_wvap_al` | White VAP % | 2020 Census PL 94-171 | `_al` suffix suggests **White alone, non-Hispanic** (P4_005N) |
| `bvap` | Black VAP count | 2020 Census PL 94-171 | **UNVERIFIED** — may be Black alone (P3_004N), not any-part-Black |
| `pct_bvp` | Black VAP % | 2020 Census PL 94-171 | Same uncertainty as `bvap` |
| `avap` | Asian VAP count | 2020 Census PL 94-171 | Unknown — likely Asian alone |
| `pct_avp` | Asian VAP % | 2020 Census PL 94-171 | Unknown |
| `hvap` | Hispanic VAP count | 2020 Census PL 94-171, P4_002N | Hispanic or Latino (ethnicity, any race) |
| `pct_hvp` | Hispanic VAP % | 2020 Census PL 94-171, P4_002N | — |
| `bipoc_vap` | BIPOC VAP count | Derived | `tvap - wvap` or similar |
| `pct_bp_` | BIPOC VAP % | Derived | Minority (non-White) share |

### ✅ Verified: `pct_bvp` uses any-part-Black

**Finding (verified 2026-04-16):** `pct_bvp` uses **"Black or African American
alone or in combination with one or more other races"** (any-part Black), which is
the correct VRA standard. This was confirmed by comparing district-level values
across file versions:

- The `*_2024update.geojson` files contain BOTH `pct_bvap_al` (Black alone) and
  `pct_bvp` (any-part Black), with `pct_bvp` consistently 1–3 percentage points
  higher — consistent with multiracial Black population counts.
- Older file versions (no `_2024update`) have only `pct_bvp`, and their values
  match the newer files' `pct_bvp` (any-part), not `pct_bvap_al` (alone).

**Method summary:** For each district plan, district geometry was used to aggregate
Census 2020 block-level P.L. 94-171 data, summing all race combinations that include
Black (P3_004N + 31 combination codes) to produce the any-part-Black count.

**To formally confirm for pre-2021 census-boundary maps** (senate14, congress12,
house15) via Census API, run `scripts/fetch_district_vap.py` (requires Census API
to be reachable — was under maintenance 2026-04-16).

### Original GeoJSON processing

The GeoJSON files were created before tracking was in place. The most likely
original workflow was:
- District boundary shapefiles from the Georgia General Assembly or MGGG
- Census 2020 PL 94-171 block-level files (from Census FTP) spatially joined
  to district boundaries and aggregated
- Election results joined by precinct from Georgia Secretary of State data

---

## ACS Socioeconomic Demographics

**Script:** `scripts/fetch_district_demographics.py`  
**Last run:** unknown (run date not tracked — add `--log` output going forward)

| Field | Census Variable | Table | Description |
|---|---|---|---|
| `median_income` | B19013_001E | ACS 5-yr | Median household income |
| `pct_poverty` | B17001_002E / B17001_001E | ACS 5-yr | Share below poverty line |
| `pct_bachelors_plus` | sum(B15003_022–025E) / B15003_001E | ACS 5-yr | Bachelor's degree or higher (25+) |
| `pct_male` / `pct_female` | B01001_002E, B01001_026E / B01003_001E | ACS 5-yr | Sex distribution |
| `pct_married_family` | B11001_003E / B11001_001E | ACS 5-yr | Married-couple households |
| `pct_single_parent` | (B11001_006E + B11001_009E) / B11001_001E | ACS 5-yr | Single-parent households |
| `pct_no_vehicle` | B08201_002E / B08201_001E | ACS 5-yr | No-vehicle households |
| `pct_uninsured` | sum(B27010_017,033,050,066E) / B27010_001E | ACS 5-yr | Uninsured (all age groups) |
| `pct_unemployed` | B23025_005E / B23025_003E | ACS 5-yr | Unemployment rate (labor force 16+) |

**ACS year used:** 2022 (default in script; override with `--year=YYYY`)  
**Geographic level:** Congressional district, state upper/lower legislative district  
**API endpoint:** `https://api.census.gov/data/2022/acs/acs5`

---

## Election Results

**Status: source unknown — original processing not recorded.**

| Field | Election | Race |
|---|---|---|
| `g18_pct_dem` | 2018 General | Governor (Abrams vs. Kemp) |
| `p20_pct_dem` | 2020 Presidential | Biden vs. Trump |
| `r21_pct_dem` | 2021 January Runoff | U.S. Senate (Warnock, Ossoff) |
| `g22_pct_dem` | 2022 General | Governor (Abrams vs. Kemp) |
| `s22_pct_dem` | 2022 General | U.S. Senate (Warnock vs. Walker) |
| `partisan` | Average 2018–2022 | Mean of above five elections |

**Likely source:** Georgia Secretary of State precinct-level results, aggregated
to district boundaries. The precinct-to-district assignment method is unknown.

**Denominator:** Two-party vote share (D / (D + R)), third-party votes excluded.

**Future elections to add:**
- `p24_pct_dem`: 2024 Presidential (Harris vs. Trump) — not yet in data

---

## District Boundaries

| File pattern | Plan | Source |
|---|---|---|
| `*_census20.geojson` | Pre-redistricting maps (2011–2021) | Likely Georgia General Assembly or Census TIGER/Line |
| `*_enacted_*_2024update.geojson` | Post-redistricting enacted maps | Georgia General Assembly redistricting files |
| `*_prop*.geojson`, `*_remedy*.geojson` | Proposed / remedy maps (2021, 2023) | Various (advocacy groups, court submissions) |

---

## Re-running Data Fetches

```bash
# ACS socioeconomic data (all chambers, ACS 2022)
python scripts/fetch_district_demographics.py

# Verify and fix BVAP (any-part-Black) — compare Census PL to GeoJSON
python scripts/fetch_district_vap.py --dry-run   # compare only, no writes
python scripts/fetch_district_vap.py              # compare + patch matching files
```
