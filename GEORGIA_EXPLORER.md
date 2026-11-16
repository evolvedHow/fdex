# Georgia Explorer Map

**Try it live** — https://evolvedhow.github.io/fdex/

Georgia Explorer is an interactive map of Georgia's Congressional, State
Senate, and State House districts. Search your address to find your
districts, compare the current maps against prior and proposed ones, and see
the demographic and election data behind each district — all in your
browser, free to use.

---

## Getting Started

- **Choose a map** from the boundary menu — current districts, prior maps, or
  historical/proposed alternatives.
- **Choose a data layer** from the overlay menu to color the map by
  demographics or election results.
- **Turn layers on or off** — Districts, Cities, County, and Precincts are
  independent switches, so you can combine them however you like.
- **Search** an address, county, or district number (e.g. `D5`) to jump
  straight there.
- **Hover or click** any district to see its data in the panel.

The map remembers your last map, layer, and toggle choices the next time you
visit.

---

## The Top Bar

### Boundary menu — which map am I looking at?

| Group | What's in it |
|---|---|
| **Current Maps, for 2024 and later elections** | The maps in effect today for Congress, State Senate, and State House. |
| **Prior Maps** | The maps used from 2021–2024, before the current ones took effect. |
| **Older Maps** | Congress (2011–2021), Senate (2014–2021), and House (2015–2021) — the previous decade's maps. |
| **Other Maps Proposed in 2021 and 2023** | Alternative maps that were proposed but never adopted, including the House/Senate Democratic and Republican caucus proposals and the court-ordered GHDC/GSDC remedy maps from the 2023 redistricting litigation. |

### Data overlay menu — what should the map show me?

| Layer | What it shows |
|---|---|
| **Streets** | Just the basemap — no data, for orientation. |
| **Black VAP %** | Share of voting-age residents who identified as Black, alone or in combination with another race, per the 2020 Census. |
| **Hispanic VAP %** | Share of voting-age residents who identified as Hispanic or Latino, of any race. |
| **Asian VAP %** | Share of voting-age residents who identified as Asian, alone or in combination with another race. |
| **Minority (BIPOC) VAP %** | Combined share of voting-age residents who are not white and non-Hispanic. |
| **Partisan Lean, 2018–2024** | How Democratic- or Republican-leaning an area has been on average, across six recent statewide elections: 2018 Governor, 2020 President, the 2021 U.S. Senate runoff, 2022 Governor, 2022 U.S. Senate, and 2024 President. Available at both the **district** level and the **precinct** level. |
| **Actual Results — single election** | Instead of an average, see exactly how one specific election came out — currently **2024 President** (district and precinct) and **2022 U.S. Senate** (district). Useful for spotting how much a district's vote actually swung from one race to the next, since the average can mask that. |

**A note on averages vs. single elections:** *Partisan Lean* blends six
elections together to smooth out one-off swings and show a district's
underlying tendency. *Actual Results* shows one real election, unblended.
The two will often look similar but rarely identical — toggle between them to
see the difference for any district or precinct.

**Layer switches** — *Districts*, *Cities*, *County*, and *Precincts* can be
turned on or off independently of whatever data layer you're viewing. The
*Precincts* switch only draws precinct outlines; it's separate from choosing
a precinct-level data layer above.

> **A note on race categories:** Georgia Explorer counts everyone who
> identified as Black or Asian, whether alone or combined with another race —
> the same standard used to draw the current, legally-adopted maps. (Some
> outside academic fairness studies use a narrower "alone only" definition,
> which can produce slightly different numbers — see *Fairness Benchmarks*
> below.)

---

## Selecting a District

- **Hover** a district to highlight it and show its data.
- **Click** a district to "pin" it, so the panel stays put on that district
  even as you move your mouse elsewhere.
- **Click** empty map space (or press Escape while searching) to unpin and
  go back to statewide totals.

### Search

Type any of the following:

- A **district number**, like `D5`, to jump to that district on the current map.
- A **county name**, like `Cobb County GA`.
- A **street address** or place name.

As you type, matching suggestions appear below the box — click one to jump
straight there, or press Enter to search for exactly what you typed. Searching
also remembers that location so you can look up its representatives on the
**Contact** tab.

---

## The Details Panel

Hovering or clicking a district opens an information panel — a drawer at the
bottom of the screen on phones, tablets, and laptops, or a sidebar on larger
desktop screens. It has five tabs: **Metrics**, **Election**, **Census**,
**Location**, and **Contact**. With nothing selected, it shows statewide
totals instead of one district's numbers.

### Metrics

Population and voting-age statistics for the selected district, each shown
as a share of the statewide total (with a progress bar), and flagged ▲ when
the district is the largest in the state for that measure:

- Total Population
- Voting Age Population (VAP)
- White VAP
- Black VAP
- Asian VAP
- Hispanic VAP
- Minority (BIPOC) VAP
- Partisan Lean

Tap the **ⓘ** next to any metric for a plain-language explanation.

*A note on Voting Age Population:* the U.S. Census counts everyone 18 or
older as VAP. Georgia Explorer uses a slightly refined version of that
figure — it excludes people held in state and federal prisons, because
Georgia's prison population is concentrated in a handful of rural counties
and including it would overstate how many eligible voters actually live
there. Population and VAP totals are built up from individual Census
blocks (the smallest unit the Census publishes), so district lines that
split a precinct still get an accurate count on each side.

### Election

A results bar for each of the six recent elections — **most recent first** —
showing the Democratic and Republican share of the two-party vote. The
**solid** portion of each bar is the share that "counted" toward winning the
seat (the winner needs just over 50%); the **faded** portion is wasted votes —
either surplus votes beyond what the winner needed, or all votes for the
losing side, since those didn't elect anyone either way. Each bar is labeled
with the exact D/R split.

### Census

Optional household and economic data per district, from the Census Bureau's
American Community Survey. Turn it on with **+ Show Census Demographics**:

- Median Household Income
- Below Poverty Rate
- Bachelor's Degree or Higher
- Male / Female share
- Married-couple households
- Single-parent households
- No-vehicle households
- Uninsured rate
- Unemployment rate

With nothing selected, this tab shows statewide totals instead. Hide it again
with the ✕ in its header.

### Location

Shows the **county** and **precinct-level partisan lean** for wherever you're
pointing on the map — precinct detail appears once you zoom in far enough.
Precinct election data now covers the same six elections (2018–2024) as the
district-level numbers.

### Contact — take action

Click (pin) a point on the map, or search an address, to see your elected
representatives — **most local first**: Georgia House, Georgia Senate, U.S.
House, then the statewide U.S. Senators and the President. Each one offers:

- **Email** — opens a pre-written message
- **Call** — tap-to-dial phone link
- **Text via Resistbot** — text **RESIST** to **50409**
- **Profile** — link to their official website

Before sending, you can pick a stance (**Support / Oppose / Ask / General**)
and add a topic or bill number, and Georgia Explorer drafts the message for
you.

Representative data comes from [openstates.org](https://openstates.org).

---

## Fairness Benchmarks vs. Enacted Maps

Georgia Explorer doesn't draw the fairness-benchmark comparisons directly on
the map, but here's the analysis behind the *Partisan Lean* and *Minority
VAP* layers and the fairness numbers you see in the panel.

Working with the [Princeton Gerrymandering Project](https://gerrymander.princeton.edu/),
Fair Districts GA generated **over one million simulated maps** for each
chamber — Congress, State Senate, and State House — using 2020 Census data.
Every simulated map followed state law, the federal Voting Rights Act, and
the Georgia General Assembly's own redistricting guidelines, and was then
scored on:

- **Partisan lean** — average performance across recent statewide elections.
- **Minority representation** — voting-age demographics and how many
  districts had a majority-minority population.

### Live fairness metrics

Selecting any map on Georgia Explorer instantly calculates two fairness
scores for it, shown on the statewide **Location** tab:

- **Efficiency Gap** — the difference between how many votes each party
  "wasted," as a share of all votes cast, for a given election. Near zero
  means both parties waste similar shares of votes; researchers generally
  flag anything beyond ±7–8% as notable.
- **Mean–Median Difference** — the gap between the average and the middle
  district's partisan lean. Near zero means Democratic and Republican voters
  are spread out fairly evenly across districts; a larger gap suggests one
  party's voters are packed into fewer districts than they "should" be.

For a deeper dive, see the
[Redistricting 2021: How to Map a Changing Georgia](https://fairdistrictsga.org/wp-content/uploads/2025/06/20210922-Fair-Districts-GA-Redistricting-Benchmarks-Presentation.pdf)
briefing.

> **Note:** the live numbers above are calculated on the fly from whichever
> map and district you have selected. Separate benchmark images comparing
> enacted maps to the full set of simulated maps live on Fair Districts GA's
> Mapping & Data page:
>
> - Senate / House / Congressional Fairness Benchmarks vs. Enacted Maps (Partisan)
> - Senate / House / Congressional Fairness Benchmarks vs. Enacted Maps (Minority)

---

## Related Data & Resources

- [2026 Redistricting Poll – Summary](https://fairdistrictsga.org/wp-content/uploads/2026/05/2026.FairDistricts.PollResults.050826.4logo.pdf)
- [2026 Redistricting Poll – Complete Data](https://fairdistrictsga.org/wp-content/uploads/2026/05/GeorgiaPollResults-complete-2026.pdf)
- [Split Cities & Split Colleges](https://fairdistrictsga.org/home/split-cities-split-colleges/)

---

## Learn More

- [Redistricting & Gerrymandering](https://fairdistrictsga.org/home/gerrymandering/)
- [Newsletter](https://fairdistrictsga.org/home/newsletters/)
- [Mapping & Data](https://fairdistrictsga.org/home/mappingdata/)
- [Town Halls](https://fairdistrictsga.org/home/townhalls/)
- [For Legislators](https://fairdistrictsga.org/home/legislators/)
- [For Media](https://fairdistrictsga.org/home/media/)
