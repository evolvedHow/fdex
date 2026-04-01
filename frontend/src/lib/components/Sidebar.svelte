<script lang="ts">
  import {
    getHoveredDistrict,
    getStateTotals,
    getChamberDemographics,
    getDemographicsTotals,
    getLocationCounty,
    getLocationPrecinct,
  } from '../stores/state.svelte';

  let hovered  = $derived(getHoveredDistrict());
  let totals   = $derived(getStateTotals());
  let demData  = $derived(getChamberDemographics());
  let demTot   = $derived(getDemographicsTotals());
  let county   = $derived(getLocationCounty());
  let precinct = $derived(getLocationPrecinct());

  // ── Info overlay state ────────────────────────────────────────────────────
  let activeInfoKey = $state<string | null>(null);

  const INFO: Record<string, { title: string; desc: string }> = {
    population: {
      title: 'Total Population',
      desc: 'The total number of residents in the district based on the 2020 Census. This includes all residents regardless of citizenship, age, or voting eligibility. Equal population across districts is the primary requirement of the "one person, one vote" standard in redistricting.',
    },
    vap: {
      title: 'Voting Age Population (VAP)',
      desc: 'The number of residents aged 18 or older based on the 2020 Census. VAP represents the pool of potentially eligible voters before accounting for citizenship or other eligibility factors. Estimates here are derived from precinct-level Census data.',
    },
    white_vap: {
      title: 'White Voting Age Population',
      desc: 'The estimated share and count of non-Hispanic white residents aged 18+, derived from 2020 Census precinct data. Racial composition of a district is one factor courts examine when evaluating compliance with the Voting Rights Act and assessing community representation.',
    },
    black_vap: {
      title: 'Black Voting Age Population',
      desc: 'The estimated share and count of non-Hispanic Black or African American residents aged 18+. The Voting Rights Act requires that district plans not dilute the voting strength of racial and language minority groups. Black VAP is a key metric in that analysis.',
    },
    asian_vap: {
      title: 'Asian Voting Age Population',
      desc: 'The estimated share and count of non-Hispanic Asian residents aged 18+. The Voting Rights Act protects Asian American voters as a language minority group in certain jurisdictions from having their voting strength diluted.',
    },
    hispanic_vap: {
      title: 'Hispanic Voting Age Population',
      desc: 'The estimated share and count of Hispanic or Latino residents aged 18+, of any race. The Voting Rights Act protects Hispanic voters\' equal opportunity to participate in the political process and elect representatives of their choice.',
    },
    minority_vap: {
      title: 'Minority (BIPOC) Voting Age Population',
      desc: 'The combined share of Black, Indigenous, and People of Color (BIPOC) residents aged 18+. This broad measure captures the total non-white voting-age population in the district. Note that individuals may identify with multiple racial/ethnic groups.',
    },
    partisan: {
      title: 'Average Partisan Lean (2018–2022)',
      desc: 'The district\'s average Democratic share of the two-party vote across multiple elections from 2018 to 2022. Values above 50% indicate the district leaned toward Democratic candidates on average; values below 50% toward Republican candidates. This is a historical summary measure based on actual election results — it does not predict future outcomes.',
    },
    election_results: {
      title: 'Per-Election Results & Wasted Votes',
      desc: 'Each row shows the Democratic share of the two-party vote for that election cycle, color-coded by which party carried the district. "Wasted D" and "Wasted R" show the fraction of each party\'s votes that were mathematically inefficient: votes beyond the winning threshold (for the winner) or all votes cast for the losing candidate. These wasted vote fractions are the building blocks of the Efficiency Gap fairness metric.',
    },
    efficiency_gap: {
      title: 'Efficiency Gap',
      desc: 'A quantitative measure of vote efficiency symmetry across a district plan, introduced by Stephanopoulos & McGhee (2015). It is calculated as: (total wasted votes for Party D − total wasted votes for Party R) ÷ total votes cast. A value near zero indicates both parties waste similar fractions of their votes. A large positive or negative value suggests the plan systematically produces more wasted votes for one party than the other — through packing (large win margins) or cracking (spreading supporters across losing districts). The sign tells you which direction the disparity runs. Scholars generally consider values above ±7–8% to be significant.',
    },
    mean_median: {
      title: 'Mean–Median Difference',
      desc: 'The difference between the mean (average) and median district-level partisan vote share across all districts in the plan. When supporters of one party are heavily concentrated in a few districts, the mean and median diverge. A value near zero suggests voter distributions are more symmetric across districts. A larger gap in either direction indicates one party\'s voters are more clustered — winning some districts by large margins while losing others by smaller ones. The sign indicates which direction the skew runs.',
    },
    median_income: {
      title: 'Median Household Income',
      desc: 'The midpoint of household income in the district, from the Census Bureau\'s American Community Survey (ACS) 5-year estimates. Half of households earn above this figure, half below. A useful economic indicator, though it does not capture the full income distribution or account for regional cost-of-living differences.',
    },
    poverty: {
      title: 'Below Poverty Rate',
      desc: 'The percentage of residents with income below the federal poverty threshold, from ACS 5-year estimates. The federal poverty line is a national standard and does not adjust for regional cost-of-living differences.',
    },
    bachelors: {
      title: "Bachelor's Degree or Higher",
      desc: "The share of adults aged 25+ who hold at least a bachelor's degree, from ACS 5-year estimates. Educational attainment is often correlated with labor market outcomes and civic participation rates.",
    },
    no_vehicle: {
      title: 'No-Vehicle Households',
      desc: 'The share of households with no vehicle available, from ACS 5-year estimates. This metric can reflect access constraints — including access to polling locations — and broader transportation infrastructure gaps.',
    },
    uninsured: {
      title: 'Uninsured Rate',
      desc: 'The share of the civilian noninstitutionalized population without health insurance coverage, from ACS 5-year estimates.',
    },
    unemployment: {
      title: 'Unemployment Rate',
      desc: 'The share of the civilian labor force that is unemployed and actively seeking work, from ACS 5-year estimates.',
    },
  };

  // Maps table row labels to INFO keys for the ⓘ button lookup
  const LABEL_TO_INFO: Record<string, string> = {
    'Population':    'population',
    'VAP 2020':      'vap',
    'White VAP':     'white_vap',
    'Black VAP':     'black_vap',
    'Asian VAP':     'asian_vap',
    'Hispanic VAP':  'hispanic_vap',
    'Minority VAP':  'minority_vap',
    'Dem 2018–22':   'partisan',
    'Median Income': 'median_income',
    'Below Poverty': 'poverty',
    "Bachelor's+":   'bachelors',
    'No Vehicle HH': 'no_vehicle',
    'Uninsured':     'uninsured',
    'Unemployment':  'unemployment',
  };

  // ── Formatters ───────────────────────────────────────────────────────────
  function fmt(n: number | undefined): string {
    if (n == null) return '—';
    return n.toLocaleString('en-US');
  }
  function pct(n: number | undefined): string {
    if (n == null) return '—';
    return `${(n * 100).toFixed(1)}%`;
  }
  function money(n: number | undefined | null): string {
    if (n == null) return '—';
    return `$${n.toLocaleString('en-US')}`;
  }
  function sharePct(share: number): string {
    return `${(share * 100).toFixed(1)}%`;
  }
  function isMax(val: number, max: number): boolean {
    return max > 0 && Math.abs(val - max) < 0.5;
  }
  function isMaxF(val: number, max: number): boolean {
    return max > 0 && Math.abs(val - max) < 0.0001;
  }

  let districtNum = $derived(
    hovered?.properties?.district ?? hovered?.properties?.DISTRICT ?? '',
  );

  // ── District plan rows ────────────────────────────────────────────────────
  type Row = [string, string, number | null, boolean];

  const ELECTION_DEFS = [
    { key: 'g18_pct_dem', label: '2018 Gen' },
    { key: 'p20_pct_dem', label: '2020 Pres' },
    { key: 'r21_pct_dem', label: '2021 Runoff' },
    { key: 'g22_pct_dem', label: '2022 Gen' },
    { key: 's22_pct_dem', label: '2022 Senate' },
  ];

  let planRows = $derived<Row[]>((() => {
    if (!hovered) return [];
    const p = hovered.properties;
    const t = totals;
    const distBvap   = (p.tvap ?? 0) * (p.pct_bvp ?? 0);
    const distAvap   = (p.tvap ?? 0) * (p.pct_avp ?? 0);
    const distHvap   = (p.tvap ?? 0) * (p.pct_hvp ?? 0);
    const distBipoc  = (p.tvap ?? 0) * (p.pct_bp_ ?? 0);
    const distWvap   = (p.tvap ?? 0) * (p.pct_wvap_al ?? 0);
    return [
      ['Population',   fmt(p.pop),
        t && p.pop  != null ? p.pop  / t.pop   : null,
        t != null && p.pop  != null && isMax(p.pop,   t.maxPop)],
      ['VAP 2020',     fmt(p.tvap),
        t && p.tvap != null ? p.tvap / t.tvap  : null,
        t != null && p.tvap != null && isMax(p.tvap,  t.maxTvap)],
      ['White VAP',    pct(p.pct_wvap_al),
        t && t.wvap    > 0 ? distWvap  / t.wvap    : null,
        t != null && t.maxWvap > 0 && isMax(distWvap, t.maxWvap)],
      ['Black VAP',    pct(p.pct_bvp),
        t && t.bvap    > 0 ? distBvap  / t.bvap    : null,
        t != null && isMax(distBvap,   t.maxBvap)],
      ['Asian VAP',    pct(p.pct_avp),
        t && t.avap    > 0 ? distAvap  / t.avap    : null,
        t != null && isMax(distAvap,   t.maxAvap)],
      ['Hispanic VAP', pct(p.pct_hvp),
        t && t.hvap    > 0 ? distHvap  / t.hvap    : null,
        t != null && isMax(distHvap,   t.maxHvap)],
      ['Minority VAP', pct(p.pct_bp_),
        t && t.bipocvap > 0 ? distBipoc / t.bipocvap : null,
        t != null && isMax(distBipoc,  t.maxBipocvap)],
      ['Dem 2018–22',  pct(p.partisan), null, false],
    ];
  })());

  // ── Census demographics rows ──────────────────────────────────────────────
  let demoRows = $derived<Row[]>((() => {
    if (!hovered || !demData || !demTot) return [];
    const key = String(Math.round(Number(hovered.properties.district ?? hovered.properties.DISTRICT ?? 0)));
    const d = demData[key];
    if (!d) return [];
    return [
      ['Median Income',   money(d.median_income),   null,
        isMax(d.median_income ?? 0, demTot.maxMedianIncome)],
      ['Below Poverty',   pct(d.pct_poverty),
        demTot.poverty_count > 0 && d.poverty_count != null ? d.poverty_count / demTot.poverty_count : null,
        isMaxF(d.pct_poverty ?? 0, demTot.maxPctPoverty)],
      ["Bachelor's+",     pct(d.pct_bachelors_plus),
        demTot.bachelors_plus_count > 0 && d.bachelors_plus_count != null ? d.bachelors_plus_count / demTot.bachelors_plus_count : null,
        isMaxF(d.pct_bachelors_plus ?? 0, demTot.maxPctBachelors)],
      ['Male',            pct(d.pct_male),            null, false],
      ['Female',          pct(d.pct_female),          null, false],
      ['Married HH',      pct(d.pct_married_family),
        demTot.married_hh_count > 0 && d.married_hh_count != null ? d.married_hh_count / demTot.married_hh_count : null,
        isMaxF(d.pct_married_family ?? 0, demTot.maxPctMarried)],
      ['Single Parent',   pct(d.pct_single_parent),
        demTot.single_parent_count > 0 && d.single_parent_count != null ? d.single_parent_count / demTot.single_parent_count : null,
        isMaxF(d.pct_single_parent ?? 0, demTot.maxPctSingleParent)],
      ['No Vehicle HH',   pct(d.pct_no_vehicle),
        demTot.no_vehicle_count > 0 && d.no_vehicle_count != null ? d.no_vehicle_count / demTot.no_vehicle_count : null,
        isMaxF(d.pct_no_vehicle ?? 0, demTot.maxPctNoVehicle)],
      ['Uninsured',       pct(d.pct_uninsured),
        demTot.uninsured_count > 0 && d.uninsured_count != null ? d.uninsured_count / demTot.uninsured_count : null,
        isMaxF(d.pct_uninsured ?? 0, demTot.maxPctUninsured)],
      ['Unemployment',    pct(d.pct_unemployed),
        demTot.labor_force_count > 0 && d.unemployed_count != null ? d.unemployed_count / demTot.labor_force_count : null,
        isMaxF(d.pct_unemployed ?? 0, demTot.maxPctUnemployed)],
    ];
  })());

  // ── Per-district election results + wasted votes ──────────────────────────
  type ElectionRow = { label: string; dem: number; wastedDPct: number; wastedRPct: number };

  let electionRows = $derived<ElectionRow[]>((() => {
    if (!hovered) return [];
    const p = hovered.properties;
    const rows: ElectionRow[] = [];
    for (const { key, label } of ELECTION_DEFS) {
      const dem = p[key] as number | undefined;
      if (dem == null) continue;
      rows.push({
        label,
        dem,
        wastedDPct: dem > 0.5 ? dem - 0.5 : dem,
        wastedRPct: dem > 0.5 ? 1 - dem   : 0.5 - dem,
      });
    }
    return rows;
  })());
</script>

<!-- Fixed-width sidebar, full height, always visible -->
<div class="w-[300px] shrink-0 flex flex-col bg-white border-l border-gray-200 text-[#29315F] overflow-hidden relative">

  <!-- ── Info overlay ────────────────────────────────────────────────────── -->
  {#if activeInfoKey && INFO[activeInfoKey]}
    <div
      class="absolute inset-0 bg-black/30 z-20 flex items-end"
      role="button"
      tabindex="0"
      onclick={() => activeInfoKey = null}
      onkeydown={(e) => e.key === 'Escape' && (activeInfoKey = null)}
    >
      <div
        class="w-full bg-white border-t-2 border-[#29315F] shadow-xl p-4 max-h-[70%] overflow-y-auto"
        role="none"
        onclick={(e) => e.stopPropagation()}
      >
        <div class="flex items-start justify-between mb-2">
          <div class="text-[13px] font-semibold text-[#29315F] leading-snug pr-2">
            {INFO[activeInfoKey].title}
          </div>
          <button
            type="button"
            class="text-gray-400 hover:text-gray-700 text-[16px] leading-none shrink-0 mt-0.5"
            onclick={() => activeInfoKey = null}
            aria-label="Close"
          >✕</button>
        </div>
        <p class="text-[11px] text-gray-600 leading-relaxed">
          {INFO[activeInfoKey].desc}
        </p>
      </div>
    </div>
  {/if}

  <!-- ── Full-height scrollable content ─────────────────────────────────── -->
  <div class="flex-1 overflow-y-auto">

  {#if hovered}

    <!-- Compact district title strip -->
    <div class="px-3 pt-2 pb-1 border-b border-gray-100 bg-[#F0F1F5]">
      <span class="text-[12px] font-semibold">{hovered.tooltipTitle ?? ''}</span>
      {#if districtNum}
        <span class="text-[11px] text-gray-500"> · District {districtNum}</span>
      {/if}
      {#if county}
        <span class="text-[11px] text-gray-400"> · {county} Co.</span>
      {/if}
    </div>

    <div class="px-3 py-2 text-[12px]">

      <!-- District Metrics -->
      <div class="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
        District Metrics
      </div>
      <table class="w-full border-collapse mb-3">
        <tbody>
          {#each planRows as [label, value, share, largest]}
            <tr class="border-b border-gray-100 last:border-0">
              <td class="text-gray-500 py-[3px] pr-2 whitespace-nowrap align-top">
                {label}
                {#if LABEL_TO_INFO[label]}
                  <button
                    type="button"
                    class="text-gray-300 hover:text-blue-400 ml-0.5 text-[10px] leading-none align-middle cursor-pointer"
                    onclick={() => activeInfoKey = LABEL_TO_INFO[label]}
                    title="What is this?"
                  >ⓘ</button>
                {/if}
              </td>
              <td class="text-right py-[3px] align-top">
                <div class="font-medium tabular-nums flex items-center justify-end gap-1 flex-wrap">
                  {value}
                  {#if share != null}
                    <span class="text-gray-400 font-normal text-[11px]">{sharePct(share)}</span>
                  {/if}
                  {#if largest}
                    <span class="inline-block bg-amber-100 text-amber-700 text-[9px] font-semibold px-[4px] py-[1px] rounded leading-tight" title="Largest among all districts">▲ max</span>
                  {/if}
                </div>
                {#if share != null}
                  <div class="w-full h-[3px] bg-gray-100 rounded-full mt-[2px]">
                    <div class="h-[3px] rounded-full {largest ? 'bg-amber-400' : 'bg-blue-400'}" style="width: {Math.min(share * 100, 100)}%"></div>
                  </div>
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>

      <!-- Election Results & Efficiency Gap -->
      {#if electionRows.length > 0}
        <div class="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1 flex items-center gap-1">
          Election Results
          <button
            type="button"
            class="text-gray-300 hover:text-blue-400 text-[10px] leading-none cursor-pointer font-normal normal-case"
            onclick={() => activeInfoKey = 'election_results'}
            title="What is this?"
          >ⓘ</button>
        </div>
        <table class="w-full border-collapse mb-3">
          <thead>
            <tr>
              <td class="text-gray-400 text-[10px] py-[2px] pr-2"></td>
              <td class="text-right text-gray-400 text-[10px] py-[2px] pr-1">%Dem</td>
              <td class="text-right text-gray-400 text-[10px] py-[2px] pr-1">Wasted D</td>
              <td class="text-right text-gray-400 text-[10px] py-[2px]">Wasted R</td>
            </tr>
          </thead>
          <tbody>
            {#each electionRows as row}
              <tr class="border-b border-gray-100 last:border-0">
                <td class="text-gray-500 py-[3px] pr-2 whitespace-nowrap">{row.label}</td>
                <td class="text-right py-[3px] pr-1 font-medium tabular-nums {row.dem > 0.5 ? 'text-blue-600' : 'text-red-600'}">
                  {pct(row.dem)}
                </td>
                <td class="text-right py-[3px] pr-1 tabular-nums text-blue-500 text-[11px]">
                  {pct(row.wastedDPct)}
                </td>
                <td class="text-right py-[3px] tabular-nums text-red-500 text-[11px]">
                  {pct(row.wastedRPct)}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}

      <!-- Census Demographics -->
      {#if demData}
        <div class="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
          Census Demographics (ACS 5-yr)
        </div>
        {#if demoRows.length === 0}
          <p class="text-[11px] text-gray-400 italic mb-3">No ACS data for this district.</p>
        {:else}
          <table class="w-full border-collapse mb-3">
            <tbody>
              {#each demoRows as [label, value, share, largest]}
                <tr class="border-b border-gray-100 last:border-0">
                  <td class="text-gray-500 py-[3px] pr-2 whitespace-nowrap align-top">
                    {label}
                    {#if LABEL_TO_INFO[label]}
                      <button
                        type="button"
                        class="text-gray-300 hover:text-blue-400 ml-0.5 text-[10px] leading-none align-middle cursor-pointer"
                        onclick={() => activeInfoKey = LABEL_TO_INFO[label]}
                        title="What is this?"
                      >ⓘ</button>
                    {/if}
                  </td>
                  <td class="text-right py-[3px] align-top">
                    <div class="font-medium tabular-nums flex items-center justify-end gap-1 flex-wrap">
                      {value}
                      {#if share != null}
                        <span class="text-gray-400 font-normal text-[11px]">{sharePct(share)}</span>
                      {/if}
                      {#if largest}
                        <span class="inline-block bg-amber-100 text-amber-700 text-[9px] font-semibold px-[4px] py-[1px] rounded leading-tight" title="Largest among all districts">▲ max</span>
                      {/if}
                    </div>
                    {#if share != null}
                      <div class="w-full h-[3px] bg-gray-100 rounded-full mt-[2px]">
                        <div class="h-[3px] rounded-full {largest ? 'bg-amber-400' : 'bg-blue-400'}" style="width: {Math.min(share * 100, 100)}%"></div>
                      </div>
                    {/if}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        {/if}
      {/if}

      <!-- County -->
      <div class="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
        County
      </div>
      <div class="mb-3 text-[12px]">
        {#if county}
          <div class="font-medium">{county} County</div>
        {:else}
          <div class="text-gray-400 italic">County data unavailable at this zoom</div>
        {/if}
      </div>

      <!-- Precinct -->
      <div class="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
        Precinct
      </div>
      <div class="mb-3 text-[12px]">
        {#if precinct && precinct.partisan != null}
          <table class="w-full border-collapse">
            <tbody>
              <tr class="border-b border-gray-100">
                <td class="text-gray-500 py-[3px] pr-2">Partisan Lean</td>
                <td class="text-right py-[3px] font-medium tabular-nums">{pct(precinct.partisan as number)}</td>
              </tr>
            </tbody>
          </table>
        {:else}
          <div class="text-gray-400 italic">Zoom in for precinct-level data</div>
        {/if}
      </div>

      <!-- Legend -->
      <div class="text-gray-400 text-[10px] border-t border-gray-100 pt-2 flex flex-col gap-1">
        <div class="flex items-center gap-1.5">
          <span class="inline-block w-5 h-[3px] bg-blue-400 rounded-full shrink-0"></span>
          <span>% = district's share of state total</span>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="inline-block bg-amber-100 text-amber-700 text-[9px] font-semibold px-[4px] py-[1px] rounded leading-tight shrink-0">▲ max</span>
          <span>= largest district for this metric</span>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="text-gray-400 text-[10px]">ⓘ</span>
          <span>= click for metric description</span>
        </div>
        <div class="italic">* VAP estimates based on precincts · Census ACS 5-yr</div>
      </div>

    </div><!-- end district content -->

  {:else}
    <!-- ── Statewide totals ──────────────────────────────────────────────── -->

    <!-- Compact statewide title strip -->
    <div class="px-3 pt-2 pb-1 border-b border-gray-100 bg-[#F0F1F5]">
      <span class="text-[12px] font-semibold">Georgia Statewide</span>
      <span class="text-[11px] text-gray-500"> · Hover a district for details</span>
    </div>

    {#if totals}
      <div class="px-3 py-2 text-[12px]">

        <!-- VAP & Population -->
        <div class="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
          Statewide Metrics
        </div>
        <table class="w-full border-collapse mb-3">
          <tbody>
            <tr class="border-b border-gray-100">
              <td class="text-gray-500 py-[3px] pr-2">
                Population
                <button type="button" class="text-gray-300 hover:text-blue-400 ml-0.5 text-[10px] leading-none align-middle cursor-pointer" onclick={() => activeInfoKey = 'population'} title="What is this?">ⓘ</button>
              </td>
              <td class="text-right py-[3px] font-medium tabular-nums">{fmt(totals.pop)}</td>
            </tr>
            <tr class="border-b border-gray-100">
              <td class="text-gray-500 py-[3px] pr-2">
                VAP 2020
                <button type="button" class="text-gray-300 hover:text-blue-400 ml-0.5 text-[10px] leading-none align-middle cursor-pointer" onclick={() => activeInfoKey = 'vap'} title="What is this?">ⓘ</button>
              </td>
              <td class="text-right py-[3px] font-medium tabular-nums">{fmt(totals.tvap)}</td>
            </tr>
            {#if totals.wvap > 0}
            <tr class="border-b border-gray-100">
              <td class="text-gray-500 py-[3px] pr-2">
                White VAP
                <button type="button" class="text-gray-300 hover:text-blue-400 ml-0.5 text-[10px] leading-none align-middle cursor-pointer" onclick={() => activeInfoKey = 'white_vap'} title="What is this?">ⓘ</button>
              </td>
              <td class="text-right py-[3px] font-medium tabular-nums">
                {totals.tvap > 0 ? pct(totals.wvap / totals.tvap) : '—'}
                <span class="text-gray-400 font-normal text-[11px] ml-1">{fmt(totals.wvap)}</span>
              </td>
            </tr>
            {/if}
            <tr class="border-b border-gray-100">
              <td class="text-gray-500 py-[3px] pr-2">
                Black VAP
                <button type="button" class="text-gray-300 hover:text-blue-400 ml-0.5 text-[10px] leading-none align-middle cursor-pointer" onclick={() => activeInfoKey = 'black_vap'} title="What is this?">ⓘ</button>
              </td>
              <td class="text-right py-[3px] font-medium tabular-nums">
                {totals.tvap > 0 ? pct(totals.bvap / totals.tvap) : '—'}
                <span class="text-gray-400 font-normal text-[11px] ml-1">{fmt(totals.bvap)}</span>
              </td>
            </tr>
            <tr class="border-b border-gray-100">
              <td class="text-gray-500 py-[3px] pr-2">
                Asian VAP
                <button type="button" class="text-gray-300 hover:text-blue-400 ml-0.5 text-[10px] leading-none align-middle cursor-pointer" onclick={() => activeInfoKey = 'asian_vap'} title="What is this?">ⓘ</button>
              </td>
              <td class="text-right py-[3px] font-medium tabular-nums">
                {totals.tvap > 0 ? pct(totals.avap / totals.tvap) : '—'}
                <span class="text-gray-400 font-normal text-[11px] ml-1">{fmt(totals.avap)}</span>
              </td>
            </tr>
            <tr class="border-b border-gray-100">
              <td class="text-gray-500 py-[3px] pr-2">
                Hispanic VAP
                <button type="button" class="text-gray-300 hover:text-blue-400 ml-0.5 text-[10px] leading-none align-middle cursor-pointer" onclick={() => activeInfoKey = 'hispanic_vap'} title="What is this?">ⓘ</button>
              </td>
              <td class="text-right py-[3px] font-medium tabular-nums">
                {totals.tvap > 0 ? pct(totals.hvap / totals.tvap) : '—'}
                <span class="text-gray-400 font-normal text-[11px] ml-1">{fmt(totals.hvap)}</span>
              </td>
            </tr>
            <tr class="border-b border-gray-100 last:border-0">
              <td class="text-gray-500 py-[3px] pr-2">
                Minority VAP
                <button type="button" class="text-gray-300 hover:text-blue-400 ml-0.5 text-[10px] leading-none align-middle cursor-pointer" onclick={() => activeInfoKey = 'minority_vap'} title="What is this?">ⓘ</button>
              </td>
              <td class="text-right py-[3px] font-medium tabular-nums">
                {totals.tvap > 0 ? pct(totals.bipocvap / totals.tvap) : '—'}
                <span class="text-gray-400 font-normal text-[11px] ml-1">{fmt(totals.bipocvap)}</span>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Census Demographics totals -->
        {#if demTot}
          <div class="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
            Census Demographics (ACS 5-yr)
          </div>
          <table class="w-full border-collapse mb-3">
            <tbody>
              <tr class="border-b border-gray-100">
                <td class="text-gray-500 py-[3px] pr-2">Below Poverty</td>
                <td class="text-right py-[3px] font-medium tabular-nums">{fmt(demTot.poverty_count)}</td>
              </tr>
              <tr class="border-b border-gray-100">
                <td class="text-gray-500 py-[3px] pr-2">Bachelor's+</td>
                <td class="text-right py-[3px] font-medium tabular-nums">{fmt(demTot.bachelors_plus_count)}</td>
              </tr>
              <tr class="border-b border-gray-100">
                <td class="text-gray-500 py-[3px] pr-2">Married HH</td>
                <td class="text-right py-[3px] font-medium tabular-nums">{fmt(demTot.married_hh_count)}</td>
              </tr>
              <tr class="border-b border-gray-100">
                <td class="text-gray-500 py-[3px] pr-2">Single Parent</td>
                <td class="text-right py-[3px] font-medium tabular-nums">{fmt(demTot.single_parent_count)}</td>
              </tr>
              <tr class="border-b border-gray-100">
                <td class="text-gray-500 py-[3px] pr-2">No Vehicle HH</td>
                <td class="text-right py-[3px] font-medium tabular-nums">{fmt(demTot.no_vehicle_count)}</td>
              </tr>
              <tr class="border-b border-gray-100">
                <td class="text-gray-500 py-[3px] pr-2">Uninsured</td>
                <td class="text-right py-[3px] font-medium tabular-nums">{fmt(demTot.uninsured_count)}</td>
              </tr>
              <tr class="border-b border-gray-100 last:border-0">
                <td class="text-gray-500 py-[3px] pr-2">Unemployed</td>
                <td class="text-right py-[3px] font-medium tabular-nums">{fmt(demTot.unemployed_count)}</td>
              </tr>
            </tbody>
          </table>
        {/if}

        <!-- Fairness Metrics -->
        {#if totals.elections.some((e) => e.hasData)}
          <div class="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
            Fairness Metrics
          </div>

          <!-- Efficiency Gap per election -->
          <div class="text-[10px] text-gray-500 mb-0.5 font-medium flex items-center gap-1">
            Efficiency Gap
            <button type="button" class="text-gray-300 hover:text-blue-400 text-[10px] leading-none cursor-pointer" onclick={() => activeInfoKey = 'efficiency_gap'} title="What is this?">ⓘ</button>
          </div>
          <table class="w-full border-collapse mb-1">
            <tbody>
              {#each totals.elections.filter((e) => e.hasData) as el}
                <tr class="border-b border-gray-100 last:border-0">
                  <td class="text-gray-500 py-[3px] pr-2 whitespace-nowrap">{el.label}</td>
                  <td class="text-right py-[3px] font-medium tabular-nums {el.eg > 0 ? 'text-blue-600' : 'text-red-600'}">
                    {el.eg > 0 ? '+' : ''}{(el.eg * 100).toFixed(1)}%
                  </td>
                  <td class="text-right py-[3px] text-gray-400 text-[10px] pl-1 whitespace-nowrap">
                    {el.eg > 0 ? 'D wasted > R' : 'R wasted > D'}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
          <div class="text-gray-400 text-[10px] mb-2 italic">
            EG = (wasted D − wasted R) ÷ total votes cast.
          </div>

          <!-- Mean-Median Difference -->
          {#if totals.meanPartisan > 0}
            <div class="text-[10px] text-gray-500 mb-0.5 font-medium flex items-center gap-1">
              Mean–Median Difference
              <button type="button" class="text-gray-300 hover:text-blue-400 text-[10px] leading-none cursor-pointer" onclick={() => activeInfoKey = 'mean_median'} title="What is this?">ⓘ</button>
            </div>
            <table class="w-full border-collapse mb-1">
              <tbody>
                <tr class="border-b border-gray-100">
                  <td class="text-gray-500 py-[3px] pr-2">Mean partisan</td>
                  <td class="text-right py-[3px] font-medium tabular-nums">{pct(totals.meanPartisan)}</td>
                </tr>
                <tr class="border-b border-gray-100">
                  <td class="text-gray-500 py-[3px] pr-2">Median partisan</td>
                  <td class="text-right py-[3px] font-medium tabular-nums">{pct(totals.medianPartisan)}</td>
                </tr>
                <tr class="border-b border-gray-100 last:border-0">
                  <td class="text-gray-500 py-[3px] pr-2 font-medium">MM Difference</td>
                  <td class="text-right py-[3px] font-medium tabular-nums {totals.meanMedian > 0 ? 'text-blue-600' : 'text-red-600'}">
                    {totals.meanMedian > 0 ? '+' : ''}{(totals.meanMedian * 100).toFixed(2)}%
                  </td>
                </tr>
              </tbody>
            </table>
            <div class="text-gray-400 text-[10px] mb-3 italic">
              Mean − median partisan lean across all districts.
            </div>
          {/if}
        {/if}

        <div class="text-gray-400 text-[10px] border-t border-gray-100 pt-2 flex flex-col gap-1">
          <div class="flex items-center gap-1.5">
            <span class="text-gray-400 text-[10px]">ⓘ</span>
            <span>= click for metric description</span>
          </div>
          <div class="italic">* VAP estimates based on precincts · Census ACS 5-yr</div>
        </div>

      </div>
    {:else}
      <div class="flex-1 flex items-center justify-center text-[12px] text-gray-400 italic px-4 text-center py-8">
        Loading statewide data…
      </div>
    {/if}
  {/if}

  </div><!-- end scrollable -->
</div>
